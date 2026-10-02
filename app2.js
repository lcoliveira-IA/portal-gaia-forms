// ============================================================================
// PORTAL GAIA - ADAPTAÇÃO PARA MODO ESTÁTICO (GITHUB PAGES / LOCALSTORAGE)
// ============================================================================
window.IS_STATIC_MODE = true;

window.addEventListener('error', function(event) {
    console.error("ERRO JS INESPERADO: ", event.message, " na linha ", event.lineno);
});
window.addEventListener('unhandledrejection', function(event) {
    console.error("ERRO ASYNC INESPERADO: ", event.reason);
});



function formatLegacyText(text) {

    if (!text) return "";

    let escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;

}



// Application Logic for Global Antares Implantation Web Form

let formSchema = [];

let isEditMode = false;
let isCurrentClientLocked = false;
let currentProfileId = null;
let clientProfiles = [];

async function handleFormFinalization() {
    if (isCurrentClientLocked) {
        showAlertModal("Este formulário já está finalizado e bloqueado.");
        return;
    }

    if (typeof window.validateEmpresasForFinalization === "function") {
        if (!window.validateEmpresasForFinalization()) {
            showAlertModal("Não é possível finalizar. Por favor, preencha todos os campos obrigatórios das Empresas (destacados em vermelho) na seção 'Dados da Empresa'.");
            return;
        }
    }

    const unfilled = getUnfilledRequiredFields();
    if (unfilled.length > 0) {
        let msg = "Não é possível finalizar o formulário ainda. Existem " + unfilled.length + " campo(s) obrigatório(s) pendente(s):\n\n";
        unfilled.slice(0, 5).forEach(u => {
            msg += "• Tópico \"" + u.topic + "\": " + u.question + "\n";
        });
        if (unfilled.length > 5) {
            msg += "... e mais " + (unfilled.length - 5) + " campo(s).";
        }
        showAlertModal(msg);
        return;
    }

    const consultorEmailInput = document.getElementById("input-consultor-email");
    const consultorEmailVal = (consultorEmailInput && consultorEmailInput.value.trim()) 
        || window.consultorEmail 
        || (localStorage.getItem("gaia_consultor_email_" + currentClientId) || "");

    let confirmMsg = "Deseja finalizar o formulário?\n\nApós a finalização, ele ficará bloqueado para edições e será transmitido para o Copilot Studio / SharePoint para auditoria de implantação.";
    if (consultorEmailVal) {
        confirmMsg += "\n\nUma notificação de conclusão será enviada ao consultor responsável:\n" + consultorEmailVal;
    } else {
        confirmMsg += "\n\n(Aviso: Nenhum e-mail de consultor responsável foi informado. Você ainda pode informar na primeira seção antes de finalizar).";
    }

    showConfirmModal(
        confirmMsg,
        async () => {
            try {
                showAlertModal("Transmitindo dados para a Apdata e registrando no SharePoint...\nPor favor, aguarde.");

                saveDraft();
                if (typeof saveStateToServer === "function") {
                    await saveStateToServer();
                }

                // Grava o bloqueio localmente no navegador
                localStorage.setItem("gaia_lock_" + currentClientId, "true");

                // Envia dados para o Microsoft Copilot Studio se o webhook estiver configurado
                let copilotSent = false;
                const payload = {
                    client_id: currentClientId,
                    client_name: (currentUser && currentUser.name) ? currentUser.name : (currentClientId || "Cliente GAIA"),
                    cnpj: (currentUser && currentUser.cnpj) ? currentUser.cnpj : "",
                    consultor_email: consultorEmailVal,
                    status: "Finalizado",
                    profile_id: currentProfileId || "matriz",
                    profile_name: currentProfileId ? (clientProfiles.find(p => p.id === currentProfileId)?.name || currentProfileId) : "Matriz",
                    timestamp: new Date().toISOString(),
                    empresas: (window.empresas || []),
                    state: formState,
                    profiles: clientProfiles
                };

                // Salva backup local do payload finalizado
                try {
                    localStorage.setItem("gaia_payload_final_" + currentClientId, JSON.stringify(payload));
                } catch(e) {}

                if (window.COPILOT_WEBHOOK_URL && window.COPILOT_WEBHOOK_URL.trim() !== "") {
                    try {
                        const resp = await fetch(window.COPILOT_WEBHOOK_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                        });
                        if (resp.ok) {
                            copilotSent = true;
                            console.log("[Copilot Studio] Respostas transmitidas com sucesso!");
                        } else {
                            console.warn("[Copilot Studio] Resposta HTTP do webhook:", resp.status);
                        }
                    } catch(copilotErr) {
                        console.warn("[Copilot Studio] Aviso ao transmitir para webhook:", copilotErr);
                    }
                }

                const data = { success: true, copilotSent: copilotSent };
                if (data.success) {
                    isCurrentClientLocked = true;
                    updateLockUI();
                    initWizard();
                    updateStepView();

                    let msgSuccess = "Obrigado! Formulário Finalizado e Transmitido com Sucesso!\n\nOs dados foram gravados com segurança no SharePoint e o Agente de IA iniciou a auditoria de implantação.\nTodas as edições no formulário foram bloqueadas.";
                    if (consultorEmailVal) {
                        msgSuccess += "\n\nO consultor responsável (" + consultorEmailVal + ") foi notificado sobre a conclusão.";
                    }
                    showAlertModal(msgSuccess);
                } else {
                    showAlertModal("Erro ao finalizar formulário: " + (data.error || "Erro desconhecido"));
                }
            } catch (e) {
                console.error(e);
                showAlertModal("Erro ao comunicar com o servidor para finalizar o formulário.");
            }
        },
        "Confirmar e Finalizar"
    );
}


function getUnfilledRequiredFields() {
    const unfilled = [];
    if (!formSchema || !Array.isArray(formSchema)) return unfilled;

    formSchema.forEach(sec => {
        if (!sec.content || !Array.isArray(sec.content)) return;
        
        // Retrieve active section state for company groups
        const secState = typeof getActiveSectionState === "function" 
            ? getActiveSectionState(sec.title) 
            : ((formState && formState[sec.type] && formState[sec.type][sec.title]) ? formState[sec.type][sec.title] : {});

        sec.content.forEach(item => {
            if (item.isRequired) {
                const keyText = item.text || item.titleText;
                if (!keyText) return;

                const val = secState[keyText];
                let isFilled = false;

                if (item.responseType === "checkbox") {
                    isFilled = (item.options || []).some(opt => secState[opt.label] === true);
                } else if (item.responseType === "attachment") {
                    if (Array.isArray(val)) {
                        isFilled = val.length > 0;
                    } else {
                        isFilled = Boolean(val && typeof val === "object" && val.data);
                    }
                } else {
                    isFilled = Boolean(val !== undefined && val !== null && String(val).trim() !== "");
                }

                if (!isFilled) {
                    unfilled.push({ topic: sec.title, question: keyText });
                }
            }
        });
    });
    return unfilled;
}


let currentCategory = "Folha de Pagamento";

let currentStepIndex = 0;

let formState = {};

// Dom Elements

const sectionsMenuList = document.getElementById("sections-menu-list");

const currentCategoryLabel = document.getElementById("current-category-label");

const currentSectionTitle = document.getElementById("current-section-title");

const dynamicForm = document.getElementById("dynamic-form");

const btnPrevStep = document.getElementById("btn-prev-step");

const btnNextStep = document.getElementById("btn-next-step");

const stepIndicatorText = document.getElementById("step-indicator-text");

const btnSaveDraft = document.getElementById("btn-save-draft");

const btnGenerateReport = document.getElementById("btn-generate-report");

const btnBackupDraft = document.getElementById("btn-backup-draft");

const btnRestoreDraft = document.getElementById("btn-restore-draft");

const fileRestoreDraft = document.getElementById("file-restore-draft");

const btnExportPayload = document.getElementById("btn-export-payload");

const generalProgressPct = document.getElementById("general-progress-pct");

const generalProgressFill = document.getElementById("general-progress-fill");



// Modal elements

const exportModal = document.getElementById("export-modal");

const btnCloseModal = document.getElementById("btn-close-modal");

const jsonOutput = document.getElementById("json-output");

const csvOutput = document.getElementById("csv-output");

const btnCopyClipboard = document.getElementById("btn-copy-clipboard");

const btnDownloadData = document.getElementById("btn-download-data");



// Category switching buttons

document.querySelectorAll(".category-selector .cat-btn").forEach(button => {

    button.addEventListener("click", (e) => {

        const targetBtn = e.currentTarget;

        document.querySelectorAll(".category-selector .cat-btn").forEach(b => b.classList.remove("active"));

        targetBtn.classList.add("active");

        

        currentCategory = targetBtn.getAttribute("data-category");

        currentCategoryLabel.textContent = currentCategory;

        

        currentStepIndex = 0;

        initWizard();
        updateStepView();

    });

});



// --- AUTHENTICATION & PROFILE MANAGEMENT ---

let currentUser = null;

let currentClientId = null;

function updateLockUI() {
    const lockBtn = document.getElementById("btn-toggle-lock-client");
    const lockText = document.getElementById("lock-status-text");
    if (lockBtn && lockText) {
        if (currentClientId) {
            lockBtn.classList.remove("hidden");
            if (isCurrentClientLocked) {
                lockBtn.className = "bg-error/10 text-error border border-error/30 rounded px-3 py-1 text-xs font-bold hover:bg-error/20 transition-all flex items-center gap-1.5 shadow-sm";
                lockText.innerHTML = '<i class="fa-solid fa-lock text-error"></i> Formulário Bloqueado (Clique p/ Destravar)';
            } else {
                lockBtn.className = "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 rounded px-3 py-1 text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 shadow-sm";
                lockText.innerHTML = '<i class="fa-solid fa-lock-open text-emerald-600"></i> Formulário Libera/Destravado (Clique p/ Travar)';
            }
        } else {
            lockBtn.classList.add("hidden");
        }
    }
}




function applyRoleUI(role) {
    const isConsultor = (role === "consultor" || role === "admin");
    const labelConsultor = document.getElementById("label-consultor-view");
    const btnToggleConsultor = document.getElementById("btn-toggle-consultor-view");
    
    if (labelConsultor && btnToggleConsultor) {
        if (window.isConsultorAuthorized) {
            btnToggleConsultor.style.display = "inline-flex";
            btnToggleConsultor.classList.remove("hidden");
            if (isConsultor) {
                labelConsultor.textContent = "Visão: Consultor";
                btnToggleConsultor.className = "px-3 py-2 border border-emerald-500 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 active:scale-95 cursor-pointer";
            } else {
                labelConsultor.textContent = "Alternar: Visão Consultor";
                btnToggleConsultor.className = "px-3 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold transition-all shadow-xs inline-flex items-center gap-1.5 active:scale-95 cursor-pointer";
            }
        } else {
            btnToggleConsultor.style.display = "none";
            btnToggleConsultor.classList.add("hidden");
        }
    }

    const uploadCsvContainer = document.getElementById("csv-ga-upload-container");
    const globalIaContainer = document.getElementById("global-ia-container");
    const dropdownExtrair = document.getElementById("dropdown-extrair-container");
    const fabDic = document.getElementById("fab-dicionario-1215");
    const consultantTopBar = document.getElementById("consultant-top-bar");
    const btnProcessIA = document.getElementById("btn-global-process-ia");

    if (isConsultor && window.isConsultorAuthorized) {
        if (consultantTopBar) consultantTopBar.classList.remove("hidden");
        if (uploadCsvContainer) {
            uploadCsvContainer.classList.remove("hidden");
            uploadCsvContainer.style.display = "block";
        }
        if (globalIaContainer) {
            globalIaContainer.classList.remove("hidden");
            globalIaContainer.style.display = "block";
        }
        if (dropdownExtrair) {
            dropdownExtrair.classList.remove("hidden");
            dropdownExtrair.style.display = "inline-block";
        }
        if (btnProcessIA) btnProcessIA.style.display = "flex";
        if (fabDic) {
            fabDic.classList.remove("hidden");
            fabDic.style.display = "flex";
        }
    } else {
        if (consultantTopBar) consultantTopBar.classList.add("hidden");
        if (uploadCsvContainer) {
            uploadCsvContainer.classList.add("hidden");
            uploadCsvContainer.style.display = "none";
        }
        if (globalIaContainer) {
            globalIaContainer.classList.add("hidden");
            globalIaContainer.style.display = "none";
        }
        if (dropdownExtrair) {
            dropdownExtrair.classList.add("hidden");
            dropdownExtrair.style.display = "none";
        }
        if (btnProcessIA) btnProcessIA.style.display = "none";
        if (fabDic) {
            fabDic.classList.add("hidden");
            fabDic.style.display = "none";
        }
    }
}

function updateConsultorBadge() {
    const badge = document.getElementById("consultor-email-badge");
    const textEl = document.getElementById("consultor-badge-text");
    const email = window.consultorEmail || (localStorage.getItem("gaia_consultor_email_" + (currentClientId || "cli_default")) || "");
    if (badge && textEl) {
        if (email && email.trim()) {
            textEl.textContent = email.trim();
            badge.title = "Consultor Responsável: " + email.trim();
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    }
}

async function checkAuth() {
    try {
        // Leitura de parâmetros na URL (Ex: ?empresa=CAMISA&cnpj=12345678000190&email_consultor=consultor@apdata.com.br)
        const urlParams = new URLSearchParams(window.location.search);
        const paramEmpresa = urlParams.get("empresa") || urlParams.get("cliente");
        const paramCnpj = urlParams.get("cnpj") || "";

        // Leitura do e-mail do consultor responsável na URL
        let paramConsultorEmail = urlParams.get("email_consultor") || urlParams.get("consultor_email") || urlParams.get("consultant_email");
        if (!paramConsultorEmail) {
            const rawConsultor = urlParams.get("consultor") || urlParams.get("Consultor");
            if (rawConsultor && rawConsultor.includes("@")) {
                paramConsultorEmail = rawConsultor;
            }
        }

        // O portal estático é estritamente e exclusivamente para preenchimento do CLIENTE
        window.isConsultorAuthorized = false;
        let initialRole = "cliente";

        if (paramEmpresa) {
            const cleanEmpresa = decodeURIComponent(paramEmpresa).trim();
            const safeId = "cli_" + btoa(encodeURIComponent(cleanEmpresa.toLowerCase())).replace(/[^a-zA-Z0-9]/g, "").substring(0, 16);
            currentUser = {
                role: initialRole,
                name: cleanEmpresa,
                cnpj: paramCnpj,
                client_id: safeId
            };
            localStorage.setItem("gaia_current_user", JSON.stringify(currentUser));
        } else {
            let saved = localStorage.getItem("gaia_current_user");
            if (!saved) {
                currentUser = { role: initialRole, name: "Cliente GAIA", client_id: "cli_default" };
                localStorage.setItem("gaia_current_user", JSON.stringify(currentUser));
            } else {
                try {
                    currentUser = JSON.parse(saved);
                    currentUser.role = initialRole;
                } catch(e) {
                    currentUser = { role: initialRole, name: "Cliente GAIA", client_id: "cli_default" };
                }
            }
        }
        window.currentUser = currentUser;
        currentClientId = currentUser.client_id || "cli_default";

        // Vinculação do e-mail do consultor responsável (URL ou persistência local)
        if (paramConsultorEmail) {
            window.consultorEmail = decodeURIComponent(paramConsultorEmail).trim();
            localStorage.setItem("gaia_consultor_email_" + currentClientId, window.consultorEmail);
        } else {
            window.consultorEmail = localStorage.getItem("gaia_consultor_email_" + currentClientId) || "";
        }
        currentUser.consultor_email = window.consultorEmail;

        // Setup do botão alternar visão consultor/cliente no topo (apenas para consultor autorizado)
        const btnToggleConsultor = document.getElementById("btn-toggle-consultor-view");
        if (btnToggleConsultor && !btnToggleConsultor._hasToggleListener) {
            btnToggleConsultor._hasToggleListener = true;
            btnToggleConsultor.addEventListener("click", () => {
                if (!window.isConsultorAuthorized) return;
                const newRole = (currentUser.role === "consultor") ? "cliente" : "consultor";
                currentUser.role = newRole;
                window.currentUser = currentUser;
                applyRoleUI(newRole);
                updateStepView();
                if (typeof showAlertModal === "function") {
                    showAlertModal(newRole === "consultor" ? 
                        "Visão do Consultor Ativada!\n\nAgora você pode carregar o CSV do Global Antares no menu lateral, processar o confronto com as respostas do cliente e extrair o arquivo da Rotina 1215." : 
                        "Visão do Cliente Ativada!\n\nAs ferramentas internas do consultor foram ocultadas para você visualizar como o cliente vê o formulário."
                    );
                }
            });
        }

        // Atualiza a exibição visual do nome da empresa na interface
        const badge = document.getElementById("client-company-badge");
        if (badge && currentUser.name) {
            badge.textContent = currentUser.name + (currentUser.cnpj ? " (" + currentUser.cnpj + ")" : "");
            badge.classList.remove("hidden");
        }

        updateConsultorBadge();

        applyRoleUI(currentUser.role);



        // Initialize Logout

        const btnLogout = document.getElementById("btn-logout");

        if(btnLogout) {

            btnLogout.addEventListener("click", async () => {

                await fetch("/api/logout", { method: "POST" });

                window.location.href = "login.html";

            });

        }



        // Initialize Client Management (if Consultor or Admin)

        updateClientOverlay();

        if (currentUser.role === "consultor" || currentUser.role === "admin") {

            const selector = document.getElementById("client-selector");

            selector.addEventListener("change", async (e) => {

                currentClientId = e.target.value;

                updateClientOverlay();

                if(currentClientId) {

                    const badge = document.getElementById("active-client-badge");

                    badge.classList.remove("hidden");

                    badge.innerText = "Editando Cliente: " + selector.options[selector.selectedIndex].text;

                    const editBtn = document.getElementById("btn-edit-client");

                    if (editBtn) editBtn.classList.remove("hidden");

                } else {

                    document.getElementById("active-client-badge").classList.add("hidden");

                    const editBtn = document.getElementById("btn-edit-client");

                    if (editBtn) editBtn.classList.add("hidden");

                }

                await loadProfiles();
            await loadServerState();

                await reloadSchemaForCurrentContext();

            });



            



            const editBtnEl = document.getElementById("btn-edit-client");

            if(editBtnEl) {

                editBtnEl.addEventListener("click", () => {

                    if(!currentClientId) return;

                    const selector = document.getElementById("client-selector");

                    const clientName = selector.options[selector.selectedIndex].text;

                    document.getElementById("edit-client-id").value = currentClientId;

                    document.getElementById("edit-client-name").value = clientName;

                    document.getElementById("edit-client-user").value = "";

                    document.getElementById("edit-client-pass").value = "";

                    

                    fetch("/api/clients").then(r => r.json()).then(data => {

                        const c = data.clients.find(x => x.id === currentClientId);

                        if(c) {

                            document.getElementById("edit-client-user").value = c.user;

                        }

                    });



                    document.getElementById("edit-client-modal").classList.remove("hidden");

                    document.getElementById("edit-client-modal").classList.add("flex");

                    setTimeout(() => document.getElementById("edit-client-modal-content").classList.remove("scale-95"), 10);

                });

            }



            const closeEdit = () => {

                const modalContent = document.getElementById("edit-client-modal-content");

                if (modalContent) modalContent.classList.add("scale-95");

                setTimeout(() => {

                    const modal = document.getElementById("edit-client-modal");

                    if(modal) {

                        modal.classList.add("hidden");

                        modal.classList.remove("flex");

                    }

                }, 300);

            };

            

        }



    } catch (e) {

        window.location.href = "login.html";

    }

}



function closeClientModal() {

    document.getElementById("client-modal-content").classList.add("scale-95");

    setTimeout(() => {

        document.getElementById("client-modal").classList.add("hidden");

        document.getElementById("client-modal").classList.remove("flex");

    }, 300);

}



async function loadClients() {

    try {

        const res = await fetch("/api/clients");

        if(res.ok) {

            const data = await res.json();

            const selector = document.getElementById("client-selector");

            selector.innerHTML = '<option value="">Selecione um cliente...</option>';

            data.clients.forEach(c => {

                const opt = document.createElement("option");

                opt.value = c.id;

                opt.textContent = c.name;

                selector.appendChild(opt);

            });

            if(currentClientId) selector.value = currentClientId;

        }

            updateClientOverlay();

    } catch(e) { console.error(e); }

}



async function loadServerState() {
    const stateKey = "gaia_state_" + (currentProfileId || currentClientId || "default");
    try {
        const local = localStorage.getItem(stateKey);
        if (local) {
            formState = JSON.parse(local);
        } else {
            formState = {};
        }
        const lockKey = "gaia_lock_" + currentClientId;
        isCurrentClientLocked = localStorage.getItem(lockKey) === "true";
        updateLockUI();
        updateDoubtsUI();
    } catch(e) {
        formState = {};
    }
}

async function loadProfiles() {
    try {
        const local = localStorage.getItem("gaia_profiles_" + currentClientId);
        if (local) {
            clientProfiles = JSON.parse(local);
        } else {
            clientProfiles = [];
        }
    } catch(e) {
        clientProfiles = [];
    }
    updateProfileUI();
}

async function saveProfiles() {
    try {
        localStorage.setItem("gaia_profiles_" + currentClientId, JSON.stringify(clientProfiles));
    } catch(e) {
        console.error("Erro ao salvar perfis no localStorage:", e);
    }
}

function updateProfileUI() {
    const container = document.getElementById("profile-selector-container");
    if (!container) return;
    
    // Mostra apenas se estiver logado (ou se cliente/consultor com client_id)
    if (currentUser.role === "cliente" || (currentUser.role === "consultor" && currentClientId)) {
        container.classList.remove("hidden");
    } else {
        container.classList.add("hidden");
    }

    const select = document.getElementById("profile-select");
    const parentSelect = document.getElementById("new-profile-parent");
    const list = document.getElementById("profiles-list");
    
    if (select) {
        select.innerHTML = '<option value="">Global (Matriz)</option>';
        clientProfiles.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name;
            if (p.id === currentProfileId) opt.selected = true;
            select.appendChild(opt);
        });
    }
    
    if (parentSelect) {
        parentSelect.innerHTML = '<option value="">Global (Matriz)</option><option value="none">Nenhum (Começar em Branco)</option>';
        clientProfiles.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name;
            parentSelect.appendChild(opt);
        });
    }
    
    if (list) {
        list.innerHTML = "";
        clientProfiles.forEach(p => {
            const li = document.createElement("li");
            li.className = "p-2 bg-surface-variant rounded-md flex justify-between items-center";
            const parentName = p.parent_id ? (clientProfiles.find(x => x.id === p.parent_id)?.name || p.parent_id) : "Global";
            li.innerHTML = `
                <div><span class="font-bold">${p.name}</span> <span class="text-xs text-on-surface-variant">(Herda de: ${parentName})</span></div>
                <div class="flex gap-2">
                    <button class="text-primary hover:bg-primary/10 p-1 rounded edit-profile" data-id="${p.id}" title="Editar Nome"><span class="material-symbols-outlined text-[16px]">edit</span></button>
                    <button class="text-error hover:bg-error/20 p-1 rounded delete-profile" data-id="${p.id}" title="Deletar Perfil"><span class="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
            `;
            list.appendChild(li);
        });
        
        list.querySelectorAll('.edit-profile').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.getAttribute("data-id");
                const p = clientProfiles.find(x => x.id === id);
                if (!p) return;
                
                const li = btn.closest('li');
                li.innerHTML = `
                    <div class="flex-1 flex gap-2 items-center mr-2">
                        <input type="text" class="form-input form-input-sm w-full rounded-md border-gray-300 text-sm" value="${p.name}" id="edit-input-${p.id}">
                        <button class="bg-primary text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-primary/90" id="save-edit-${p.id}">Salvar</button>
                        <button class="bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-gray-300" id="cancel-edit-${p.id}">Cancelar</button>
                    </div>
                `;
                
                document.getElementById(`save-edit-${p.id}`).onclick = async () => {
                    const newName = document.getElementById(`edit-input-${p.id}`).value;
                    if (newName && newName.trim() !== "" && newName.trim() !== p.name) {
                        p.name = newName.trim();
                        await saveProfiles();
                    }
                    updateProfileUI();
                };
                
                document.getElementById(`cancel-edit-${p.id}`).onclick = () => {
                    updateProfileUI();
                };
            };
        });

        list.querySelectorAll('.delete-profile').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const id = btn.getAttribute("data-id");
                showConfirmModal("Tem certeza que deseja deletar este perfil?", async () => {
                    clientProfiles = clientProfiles.filter(x => x.id !== id);
                    if (currentProfileId === id) {
                        currentProfileId = null;
                        await loadServerState();
                        initWizard();
                    }
                    await saveProfiles();
                    updateProfileUI();
                });
            };
        });
    }
}




async function saveServerState() {
    const stateKey = "gaia_state_" + (currentProfileId || currentClientId || "default");
    try {
        localStorage.setItem(stateKey, JSON.stringify(formState));
    } catch(e) {
        console.error("Erro ao salvar no localStorage:", e);
    }

    if (window.COPILOT_WEBHOOK_URL && window.COPILOT_WEBHOOK_URL.trim() !== "") {
        try {
            const consultorEmailVal = window.consultorEmail || (document.getElementById("input-consultor-email") ? document.getElementById("input-consultor-email").value.trim() : (localStorage.getItem("gaia_consultor_email_" + currentClientId) || ""));
            const payload = {
                client_id: currentClientId,
                client_name: (currentUser && currentUser.name) ? currentUser.name : (currentClientId || "Cliente GAIA"),
                cnpj: (currentUser && currentUser.cnpj) ? currentUser.cnpj : "",
                consultor_email: consultorEmailVal,
                status: "Rascunho",
                profile_id: currentProfileId || "matriz",
                profile_name: currentProfileId ? (clientProfiles.find(p => p.id === currentProfileId)?.name || currentProfileId) : "Matriz",
                timestamp: new Date().toISOString(),
                state: formState,
                profiles: clientProfiles
            };
            const resp = await fetch(window.COPILOT_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                console.log("[Copilot Studio] Rascunho sincronizado com o SharePoint!");
                return true;
            } else {
                console.warn("[Copilot Studio] Resposta HTTP ao sincronizar rascunho:", resp.status);
                return false;
            }
        } catch(err) {
            console.warn("[Copilot Studio] Falha ao sincronizar rascunho com a nuvem:", err);
            return false;
        }
    }
    return false;
}

// ------------------------------------------



// Load Schema

async function loadSchema() {

    try {

        await checkAuth();

        await loadProfiles();
            await loadServerState();

        await reloadSchemaForCurrentContext();

    } catch (error) {

        console.error("Falha ao carregar o schema do formulário:", error);

        currentSectionTitle.textContent = "Erro ao carregar formulários";

    }

}



// Get sections for current category

function getCategorySections() {
    if (!Array.isArray(formSchema)) return [];
    const norm = str => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const targetNorm = norm(currentCategory);
    return formSchema.filter(s => {
        const sNorm = norm(s.type);
        if (targetNorm.includes("benef") && sNorm.includes("benef")) return true;
        if (targetNorm.includes("folha") && sNorm.includes("folha")) return true;
        return sNorm === targetNorm || s.type === currentCategory;
    });
}



// Initialize Wizard Navigation

function initWizard() {

    const sections = getCategorySections();

    if (!sections.length) return;

    

    // Render sidebar step list

    sectionsMenuList.innerHTML = "";

    sections.forEach((section, index) => {

        const li = document.createElement("li");

        li.className = `step-item ${index === currentStepIndex ? "active" : ""}`;

        li.setAttribute("data-index", index);

        

        const isCompleted = isSectionComplete(section);

        const statusIcon = isCompleted 

            ? '<i class="fa-solid fa-circle-check step-status-icon completed"></i>'

            : '<i class="fa-regular fa-circle step-status-icon pending"></i>';

            

        li.innerHTML = `

            <span class="step-title-text" title="${section.title}">${index + 1}. ${section.title}</span>

            ${statusIcon}

        `;

        

        

        li.addEventListener("click", () => {

            // Allow navigation in edit mode

            currentStepIndex = index;

            updateStepView();

        });

        

        // --- EDITOR MODE: Topic actions ---

        if (isEditMode) {

            const actionsSpan = document.createElement("span");

            actionsSpan.className = "ml-auto flex gap-1";

            

            const btnEditTopic = document.createElement("button");
            btnEditTopic.type = "button";

            btnEditTopic.innerHTML = '<i class="fa-solid fa-pen text-xs"></i>';

            btnEditTopic.className = "text-on-surface-variant hover:text-primary p-1";

            btnEditTopic.onclick = (e) => {

                e.stopPropagation();

                openTopicEditor(index, section);

            };

            

            const btnDelTopic = document.createElement("button");
            btnDelTopic.type = "button";

            btnDelTopic.innerHTML = '<i class="fa-solid fa-trash text-xs"></i>';

            btnDelTopic.className = "text-on-surface-variant hover:text-error p-1";

            btnDelTopic.onclick = (e) => {

                e.stopPropagation();

                showConfirmModal(`Excluir o tópico "${section.title}"?`, async () => {

                    formSchema = formSchema.filter(s => s !== section);

                    await saveSchemaToServer();

                });

            };

            

            actionsSpan.appendChild(btnEditTopic);

            actionsSpan.appendChild(btnDelTopic);

            li.appendChild(actionsSpan);

        }



        

        sectionsMenuList.appendChild(li);

    });

    

    if (isEditMode) {

        const liAdd = document.createElement("li");

        liAdd.className = "mt-4 px-2 pb-4";

        const btnAddTopic = document.createElement("button");
        btnAddTopic.type = "button";

        btnAddTopic.className = "w-full py-2 border-2 border-dashed border-primary/50 text-primary font-bold rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-sm";

        btnAddTopic.innerHTML = '<i class="fa-solid fa-plus"></i> Novo Tópico';

        btnAddTopic.onclick = () => {

            openTopicEditor(-1, null);

        };

        liAdd.appendChild(btnAddTopic);

        sectionsMenuList.appendChild(liAdd);

    }

    

    updateStepView();

    updateProgressBar();

}



// Check if all fields in a section are completed


function getSectionProgress(section, targetFormState = formState) {
    const typeState = targetFormState[section.type] || {};
    const sectionState = typeState[section.title] || {};

    let missing = 0;
    let total = 0;

    function isGroupChecked(matches) {
        return matches.some(m => {
            const label = m[1].trim().replace(/_+$/, "");
            return sectionState[label] === true;
        });
    }

    const grouped = [];
    for (let i = 0; i < section.content.length; i++) {
        const item = JSON.parse(JSON.stringify(section.content[i]));
        item.originalIndex = i;
        if (item.element === "paragraph") {
            const cleanText = item.text.trim();
            const hasCheckboxes = /\(\s*\)|\[\s*\]/.test(cleanText);
            if (hasCheckboxes) {
                const regex = /(?:\(\s*\)|\[\s*\])\s*([^()\[\]\n\r]+)/g;
                const matches = [...cleanText.matchAll(regex)];
                let titleText = cleanText.split(/\(\s*\)|\[\s*\]/)[0].trim();
                const lastItem = grouped[grouped.length - 1];
                if (lastItem && lastItem.element === "checkbox_group" && (!titleText || titleText.length <= 3)) {
                    lastItem.matches.push(...matches);
                } else {
                    grouped.push({
                        element: "checkbox_group",
                        titleText: titleText || "Opções de Seleção",
                        matches: matches
                    });
                }
            } else {
                const isQuestion = /^[0-9]+(\.[0-9]+)*\s*[\.\-:]/.test(cleanText) || 
                                   cleanText.endsWith("?") || 
                                   cleanText.includes("___") || 
                                   cleanText.toLowerCase().includes("especificar:") ||
                                   cleanText.toLowerCase().includes("relacionar:") ||
                                   cleanText.toLowerCase().includes("descrever:");
                const nextItem = section.content[i + 1];
                if (isQuestion && nextItem && nextItem.element === "paragraph" && /\(\s*\)|\[\s*\]/.test(nextItem.text.trim())) {
                    const nextCleanText = nextItem.text.trim();
                    const regex = /(?:\(\s*\)|\[\s*\])\s*([^()\[\]\n\r]+)/g;
                    const matches = [...nextCleanText.matchAll(regex)];
                    grouped.push({
                        element: "checkbox_group",
                        titleText: cleanText,
                        matches: matches
                    });
                    i++;
                } else {
                    grouped.push(item);
                }
            }
        } else {
            grouped.push(item);
        }
    }

    if (section.content.length === 0) {
        return { hasFields: false, missing: 0, total: 0 };
    }

    grouped.forEach((item) => {
        if (item.element === "paragraph") {
            const cleanText = item.text.trim();
            const isQuestion = /^[0-9]+(\.[0-9]+)*\s*[\.\-:]/.test(cleanText) || 
                               cleanText.endsWith("?") || 
                               cleanText.includes("___") || 
                               cleanText.toLowerCase().includes("especificar:") ||
                               cleanText.toLowerCase().includes("relacionar:") ||
                               cleanText.toLowerCase().includes("descrever:");
            if (isQuestion) {
                total++;
                const cleanKey = cleanText.replace(/[\.#\$\[\]\n\r]/g, "_").substring(0, 100);
                const ignored = sectionState[cleanKey + "_ignore"] === true;
                const filled = sectionState[cleanText] !== undefined && sectionState[cleanText] !== "";
                if (!ignored && !filled) {
                    missing++;
                }
            }
        } else if (item.element === "checkbox_group") {
            total++;
            const cleanKey = item.titleText.replace(/[\.#\$\[\]\n\r]/g, "_").substring(0, 100);
            const ignored = sectionState[cleanKey + "_ignore"] === true;
            const filled = isGroupChecked(item.matches);
            if (!ignored && !filled) {
                missing++;
            }
        } else if (item.element === "table") {
            total++;
            const ignored = sectionState["config_tabelas_ignore"] === true;
            if (!ignored) {
                let tableType = item.type;
                let tableHeaders = item.headers;
                let tableRows = item.rows;
                
                if (tableType === "text_block") {
                    if (tableRows[0] && tableRows[0].length > 2) {
                        tableType = "grid";
                        tableHeaders = tableRows[0];
                        tableRows = tableRows.slice(1);
                    } else {
                        tableType = "form";
                    }
                }
                
                let tblMissing = false;
                if (tableType === "form") {
                    tableRows.forEach(row => {
                        if (row.length < 2) return;
                        const label = row[0];
                        const filled = sectionState[label] !== undefined && sectionState[label] !== "";
                        if (!filled) tblMissing = true;
                    });
                } else if (tableType === "grid") {
                    const gridTitle = tableHeaders.join(" / ");
                    const gridData = sectionState[gridTitle] || sectionState["custom_empresa_data"] || Object.values(sectionState).find(v => Array.isArray(v)) || [];
                    if (gridData.length === 0) tblMissing = true;
                }
                if (tblMissing) missing++;
            }
        } else if (item.element === "question_structured") {
            if (item.responseType === "note") return;
            total++;
            const cleanText = item.text;
            const cleanKey = cleanText.replace(/[\.#\$\[\]\n\r]/g, "_").substring(0, 100);
            const ignored = sectionState[cleanKey + "_ignore"] === true;
            
            if (!ignored) {
                let qMissing = false;
                
                if (item.responseType === "text") {
                    const filled = sectionState[cleanText] !== undefined && sectionState[cleanText] !== "" && sectionState[cleanText] !== null;
                    if (!filled) qMissing = true;
                } else if (item.responseType === "attachment") {
                    let filled = false;
                    const val = sectionState[cleanText];
                    if (Array.isArray(val)) filled = val.length > 0;
                    else filled = Boolean(val && typeof val === "object" && val.data);
                    if (!filled) qMissing = true;
                } else if (item.responseType === "dropdown") {
                    const mainFilled = sectionState[cleanText] !== undefined && sectionState[cleanText] !== "";
                    let dropFilled = mainFilled;
                    if (mainFilled && item.triggerInputOn && item.triggerInputOn.includes(sectionState[cleanText])) {
                        dropFilled = sectionState[cleanText + "_detalhe"] !== undefined && sectionState[cleanText + "_detalhe"] !== "";
                    }
                    if (!dropFilled) qMissing = true;
                } else if (item.responseType === "checkbox") {
                    const filled = item.options.some(opt => sectionState[opt.label] === true);
                    if (!filled) qMissing = true;
                }
                if (qMissing) missing++;
            }
        }
    });
    
    return { hasFields: total > 0, missing, total };
}

function isSectionComplete(section, targetFormState = formState) {
    const p = getSectionProgress(section, targetFormState);
    return p.hasFields ? p.missing === 0 : true;
}




// Update View based on current step index

function updateStepView() {

    const sections = getCategorySections();

    if (currentStepIndex >= sections.length) currentStepIndex = sections.length - 1;

    if (currentStepIndex < 0) currentStepIndex = 0;

    

    const section = sections[currentStepIndex];

    currentSectionTitle.textContent = section.title;

    stepIndicatorText.textContent = `Passo ${currentStepIndex + 1} de ${sections.length}`;
    setTimeout(applyLockStatusToInputs, 100);

    

    // Update active sidebar item

    document.querySelectorAll("#sections-menu-list .step-item").forEach((item, idx) => {

        if (idx === currentStepIndex) {

            item.classList.add("active");

            item.scrollIntoView({ block: "nearest", behavior: "smooth" });

        } else {

            item.classList.remove("active");

        }

    });

    

    // Prev/Next button states

    btnPrevStep.disabled = currentStepIndex === 0;

    btnNextStep.innerHTML = currentStepIndex === sections.length - 1 

        ? 'Finalizar <i class="fa-solid fa-check-double"></i>'

        : 'Próximo <i class="fa-solid fa-arrow-right"></i>';

        

    renderFormContent(section);

}



// Dictionary of hints and examples for complex configuration questions

const QUESTION_HINTS = {

    "quebra para emissão": "Define a ordenação e a separação na geração dos contratos de trabalho. Por exemplo: se escolher 'Filiais', o sistema gerará os arquivos agrupados e separados por cada filial da empresa.",

    "regime de pagamento": "ÃÂ¢ââ€šÂ¬Ã‚Â¢ Regime de Caixa: O pagamento da folha ocorre no mÃÆ’Ã‚ªs seguinte ao trabalhado (até o 5Ãâ€šÃ‚º dia ÃÆ’Ã‚ºtil).\nÃÂ¢ââ€šÂ¬Ã‚Â¢ Regime de CompetÃÆ’Ã‚ªncia: O pagamento ocorre dentro do próprio mÃÆ’Ã‚ªs trabalhado (ex: no dia 30).",

    "vínculos processados": "Selecione todos os tipos de contratação que a empresa possui e que serão integrados na folha (CLT, Estagiários, Aprendizes, AutÃÆ’Ã‚´nomos, etc.).",

    "bancários": "Preencha com os dados da conta corrente corporativa principal da empresa, da qual serão debitados os pagamentos dos salários.",

    "liberação de acessos": "Identifique quais usuários do RH ou TI terão acessos administrativos à s rotinas de cálculo de folha e eSocial no Global Antares.",

    "vale alimentação": "Informe o fornecedor de vale alimentação (ex: Ticket, Sodexo, Alelo) e o percentual de desconto em folha.",

    "vale refeição": "Informe o fornecedor do vale refeição (VR) e as regras de concessão (ex: se há desconto em dias de férias ou faltas).",

    "cesta básica": "Detalhe o fornecedor da cesta básica e se há subsídio financeiro parcial ou total pela empresa.",

    "assistÃÆ’Ã‚ªncia médica": "Especifique a operadora (ex: Unimed, Bradesco) e se há regras de co-participação por parte dos funcionários.",

    "assistÃÆ’Ã‚ªncia odontológica": "Especifique o plano e a abrangÃÆ’Ã‚ªncia geográfica das coberturas.",

    "responsável legal": "Informe o nome e CPF do procurador ou representante legal perante o eSocial e a DIRF.",

    "horas extras": "Especifique os percentuais de acréscimo das horas extras (ex: 50% dias ÃÆ’Ã‚ºteis, 100% domingos/feriados).",

    "quebra para emissão de kit": "Define como os documentos de admissão impressos/gerados serão agrupados. Por exemplo: se vocÃÆ’Ã‚ª selecionar 'Filiais', o sistema emitirá um lote de contratos separado para cada filial. Se escolher 'Cargo', agrupará por cargo."

};



// Check if a question text has any hints

function getHintForText(text) {

    if (!text) return null;

    const lowerText = text.toLowerCase();

    for (const key of Object.keys(QUESTION_HINTS)) {

        if (lowerText.includes(key)) {

            return QUESTION_HINTS[key];

        }

    }

    return null;

}



// Render dynamic elements

// Append Help Flag button to any card container

function appendCardHeader(cardElement, titleText, stateKey, sectionState, isFilled = false) {
    const headerDiv = document.createElement("div");
    headerDiv.className = "card-header-flex";

    const titleEl = document.createElement("h4");
    titleEl.className = "form-section-title";
    titleEl.style.cursor = "pointer";
    titleEl.innerHTML = `<i class="fa-solid fa-chevron-down card-toggle-icon" style="margin-right: 8px; font-size: 11px;"></i> ${titleText}`;
    headerDiv.appendChild(titleEl);

    const cleanKey = stateKey.replace(/[.#$[{}\]\n\r]/g, "_").substring(0, 100);
    const isHelpFlagged = sectionState[cleanKey + "_need_help"] === true;
    const isIgnored = sectionState[cleanKey + "_ignore"] === true;

    if (isHelpFlagged) {
        cardElement.classList.add("need-help-active");
    }
    if (isIgnored) {
        cardElement.classList.add("ignored-active");
    }

    // Auto collapse if filled or ignored (only if not in Edit Mode)
    let shouldCollapse = (!isEditMode && (isFilled || isIgnored) && !isHelpFlagged);
    if (window.expandedQuestions && window.expandedQuestions.has(cleanKey)) {
        shouldCollapse = false;
    } else if (window.collapsedQuestions && window.collapsedQuestions.has(cleanKey)) {
        shouldCollapse = true;
    }
    if (shouldCollapse) {
        cardElement.classList.add("collapsed");
        const icon = titleEl.querySelector(".card-toggle-icon");
        if (icon) icon.className = "fa-solid fa-chevron-right card-toggle-icon";
    }

    titleEl.addEventListener("click", () => {
        if (isEditMode) return; // Disable collapse toggle in Edit Mode
        const isCollapsed = cardElement.classList.toggle("collapsed");
        
        if (!window.expandedQuestions) window.expandedQuestions = new Set();
        if (!window.collapsedQuestions) window.collapsedQuestions = new Set();
        
        if (isCollapsed) {
            window.collapsedQuestions.add(cleanKey);
            window.expandedQuestions.delete(cleanKey);
        } else {
            window.expandedQuestions.add(cleanKey);
            window.collapsedQuestions.delete(cleanKey);
        }

        const icon = titleEl.querySelector(".card-toggle-icon");
        if (icon) {
            icon.className = isCollapsed 
                ? "fa-solid fa-chevron-right card-toggle-icon" 
                : "fa-solid fa-chevron-down card-toggle-icon";
        }
    });

    const actionsWrapper = document.createElement("div");
    actionsWrapper.style.display = "flex";
    actionsWrapper.style.gap = "8px";
    actionsWrapper.style.alignItems = "center";

    // Help Button
    const helpBtn = document.createElement("button");
    helpBtn.type = "button";
    helpBtn.className = `btn-help-flag ${isHelpFlagged ? "active" : ""}`;
    helpBtn.innerHTML = isHelpFlagged 
        ? '<i class="fa-solid fa-triangle-exclamation"></i> Dúvida' 
        : '<i class="fa-regular fa-question-circle"></i> Ajuda';

    helpBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentlyFlagged = sectionState[cleanKey + "_need_help"] === true;
        const newVal = !currentlyFlagged;
        sectionState[cleanKey + "_need_help"] = newVal;
        if (typeof updateDoubtsUI === "function") updateDoubtsUI();
        if (typeof initWizard === "function") initWizard();
        helpBtn.classList.toggle("active", newVal);
        cardElement.classList.toggle("need-help-active", newVal);
        helpBtn.innerHTML = newVal
            ? '<i class="fa-solid fa-triangle-exclamation"></i> Dúvida'
            : '<i class="fa-regular fa-question-circle"></i> Ajuda';
        saveDraft();
    });

    actionsWrapper.appendChild(helpBtn);

    // Ignore Button
    const ignoreBtn = document.createElement("button");
    ignoreBtn.type = "button";
    ignoreBtn.className = `btn-ignore-flag ${isIgnored ? "active" : ""}`;
    ignoreBtn.innerHTML = isIgnored 
        ? '<i class="fa-solid fa-eye-slash"></i> Desconsiderado' 
        : '<i class="fa-regular fa-eye-slash"></i> Não se aplica';

    ignoreBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentlyIgnored = sectionState[cleanKey + "_ignore"] === true;
        const newVal = !currentlyIgnored;
        sectionState[cleanKey + "_ignore"] = newVal;
        ignoreBtn.classList.toggle("active", newVal);
        cardElement.classList.toggle("ignored-active", newVal);
        headerDiv.classList.toggle("ignored-active", newVal);
        ignoreBtn.innerHTML = newVal
            ? '<i class="fa-solid fa-eye-slash"></i> Desconsiderado'
            : '<i class="fa-regular fa-eye-slash"></i> Não se aplica';

        const inputs = cardElement.querySelectorAll("input, textarea, select, button");
        inputs.forEach(el => {
            if (el !== ignoreBtn && el !== helpBtn && !el.classList.contains("btn-remove-row") && !el.closest(".flex.items-center.gap-1")) {
                el.disabled = newVal;
            }
        });
        saveDraft();
    });

    actionsWrapper.appendChild(ignoreBtn);

    if (isIgnored) {
        setTimeout(() => {
            const inputs = cardElement.querySelectorAll("input, textarea, select, button");
            inputs.forEach(el => {
                if (el !== ignoreBtn && el !== helpBtn && !el.classList.contains("btn-remove-row") && !el.closest(".flex.items-center.gap-1")) {
                    el.disabled = true;
                }
            });
        }, 100);
    }

    headerDiv.appendChild(actionsWrapper);
    cardElement.insertBefore(headerDiv, cardElement.firstChild);
}

// Helper to disable inputs if form is locked
function applyLockStatusToInputs() {
    if (isCurrentClientLocked && !isEditMode) {
        const dynamicForm = document.getElementById("dynamic-form");
        if (dynamicForm) {
            const controls = dynamicForm.querySelectorAll("input, textarea, select, button");
            controls.forEach(el => {
                // Skip step navigation buttons (Anterior / Próximo / Finalizar) and links
                if (el.id === "btn-prev-step" || el.id === "btn-next-step" || el.classList.contains("btn-close-modal") || el.tagName.toLowerCase() === "a") {
                    return;
                }
                el.disabled = true;
                el.style.pointerEvents = "none";
                el.style.backgroundColor = "#f3f4f6";
                el.style.opacity = "0.75";
                el.style.cursor = "not-allowed";
            });
        }
    }
}



// Render dynamic elements





function renderIAModal(type, title) {

    // Only show for consultor

    if (!currentUser || currentUser.role !== "consultor") return;

    // Descontinuado inicialmente para Dados da Empresa, Dados Bancários, Sindicato e Admissão
    const titleLower = (title || "").toLowerCase();
    const typeLower = (type || "").toLowerCase();
    if (
        typeLower === "empresas" || titleLower.includes("empresa") ||
        typeLower === "bancarios" || titleLower.includes("bancár") || titleLower.includes("bancario") ||
        typeLower === "sindicatos" || titleLower.includes("sindicato") ||
        typeLower === "contratados" || titleLower.includes("admiss")
    ) {
        return;
    }

    

    const panel = document.createElement("div");

    panel.id = "ai-section";

    panel.className = "bg-primary/5 border border-primary/20 rounded-xl p-6 mb-6 shadow-sm";

    

    panel.innerHTML = `

        <div class="flex items-center justify-between mb-4 border-b border-primary/10 pb-4">

            <h3 class="text-title-md font-bold text-primary flex items-center">

                <i class="fa-solid fa-wand-magic-sparkles mr-2 text-apdata-gold"></i>

                IA Copilot: Análise de Aderência - ${title}

            </h3>

            <button class="bg-apdata-gold text-white px-5 py-2 rounded-lg font-bold text-[13px] shadow-md hover:bg-apdata-gold/90 transition-all flex items-center" id="btn-extract-empresas" data-iatype="${type}">

                <i class="fa-solid fa-play mr-2"></i> Gerar IA

            </button>

        </div>

        

        <div class="flex gap-6">

            <div class="w-1/2 flex flex-col border-r border-outline-variant/20 pr-6">

                <h4 class="text-label-md font-bold text-on-surface-variant mb-3"><i class="fa-solid fa-chart-pie mr-2"></i>Resultados da Extração</h4>

                <div id="ia-results-panel" class="flex-1 hidden bg-white rounded-lg p-3 border border-outline-variant/30 min-h-[150px]"></div>

            </div>

            <div class="w-1/2 pl-2 flex flex-col">

                <h4 class="text-label-md font-bold text-on-surface-variant mb-3"><i class="fa-solid fa-comments mr-2"></i>Assistente de Dúvidas</h4>

                <div id="ia-chat-messages" class="flex-1 bg-white rounded-lg p-4 border border-outline-variant/30 mb-3 min-h-[150px] overflow-y-auto space-y-3">

                    <div class="text-[12px] text-on-surface-variant italic text-center mt-4">Pergunte algo ao assistente sobre o mapeamento...</div>

                </div>

                <div class="flex gap-2">

                    <input type="text" id="ia-chat-input" class="flex-1 bg-surface border border-outline-variant rounded p-2 text-[13px] focus:border-primary outline-none" placeholder="Ex: Quais sindicatos estão faltando?">

                    <button id="btn-send-chat" class="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-all"><i class="fa-solid fa-paper-plane"></i></button>

                </div>

            </div>

        </div>

    `;

    

    dynamicForm.appendChild(panel);



    // Bind the main "Executar ApScripter" button

    const btnExtract = document.getElementById("btn-extract-empresas");

    if (btnExtract) {

        btnExtract.addEventListener("click", async () => {

            const resultsPanel = document.getElementById("ia-results-panel");

            const chatMessages = document.getElementById("ia-chat-messages");

            

            btnExtract.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Processando IA...';

            btnExtract.disabled = true;

            

            try {

                // STEP 1: Execute the ApScripter .bat via POST /api/run-ia

                let runUrl = `/api/run-ia?type=${type}`;

                if (currentUser && currentUser.role === "consultor" && typeof currentClientId !== "undefined" && currentClientId) {

                    runUrl += `&client_id=${currentClientId}`;

                }

                const runRes = await fetch(runUrl, { method: "POST" });

                let runData = await runRes.json();

                

                if (runData.error) {

                    if (resultsPanel) {

                        resultsPanel.classList.remove("hidden");

                        resultsPanel.innerHTML = `<div class="text-error text-sm p-3"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Erro ao executar ApScripter: ${runData.error}</div>`;

                    }

                    btnExtract.innerHTML = '<i class="fa-solid fa-play mr-2"></i> Gerar IA';

                    btnExtract.disabled = false;

                    return;

                }

                

                // Poll for completion if it's queued
                if (runData.job_id) {
                    let status = runData.status;
                    while (status === "queued" || status === "processing") {
                        btnExtract.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Executando Scripter...`;
                        await new Promise(r => setTimeout(r, 2000));
                        try {
                            const statusRes = await fetch(`/api/job-status?job_id=${runData.job_id}`);
                            const statusData = await statusRes.json();
                            status = statusData.status;
                            if (status === "completed") {
                                runData = statusData.result || runData;
                                break;
                            } else if (status === "error") {
                                throw new Error(statusData.error || "Erro no background job");
                            }
                        } catch (err) {
                            if (resultsPanel) {
                                resultsPanel.classList.remove("hidden");
                                resultsPanel.innerHTML = `<div class="text-error text-sm p-3"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Erro no Scripter: ${err.message}</div>`;
                            }
                            btnExtract.innerHTML = '<i class="fa-solid fa-play mr-2"></i> Gerar IA';
                            btnExtract.disabled = false;
                            return;
                        }
                    }
                }
                
                // Show log if available
                if (runData.log && chatMessages) {
                    const logDiv = document.createElement("div");
                    logDiv.className = "flex items-start gap-3 w-10/12";
                    logDiv.innerHTML = `
                        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
                            <span class="material-symbols-outlined text-on-primary text-[16px]">robot_2</span>
                        </div>
                        <div class="p-3 rounded-2xl shadow-sm text-sm bg-white text-on-surface border border-outline-variant/20 rounded-tl-none">
                            <strong>ApScripter executado com sucesso!</strong> Analisando resultados...
                        </div>`;
                    chatMessages.appendChild(logDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }

                // STEP 2: Fetch report data via GET /api/report-ia

                btnExtract.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Analisando resultados...';

                

                let reportUrl = `/api/report-ia?type=${type}&category=${encodeURIComponent(currentCategory)}`;

                if (currentUser && currentUser.role === "consultor" && typeof currentClientId !== "undefined" && currentClientId) {

                    reportUrl += `&client_id=${currentClientId}`;

                }

                

                const reportRes = await fetch(reportUrl);

                const reportData = await reportRes.json();

                

                if (reportData.error) {

                    if (resultsPanel) {

                        resultsPanel.classList.remove("hidden");

                        resultsPanel.innerHTML = `<div class="text-error text-sm p-3"><i class="fa-solid fa-triangle-exclamation mr-2"></i>${reportData.error}</div>`;

                    }

                } else if (reportData.success) {

                    if (resultsPanel) {

                        resultsPanel.classList.remove("hidden");

                        if (reportData.extraction_html) {

                            resultsPanel.innerHTML = reportData.extraction_html;

                        }

                    }

                    if (reportData.ai_summary && chatMessages) {

                        const summaryDiv = document.createElement("div");

                        summaryDiv.className = "flex items-start gap-3 w-10/12";

                        summaryDiv.innerHTML = `

                            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">

                                <span class="material-symbols-outlined text-on-primary text-[16px]">robot_2</span>

                            </div>

                            <div class="p-3 rounded-2xl shadow-sm text-sm bg-white text-on-surface border border-outline-variant/20 rounded-tl-none">

                                ${reportData.ai_summary}

                            </div>`;

                        chatMessages.appendChild(summaryDiv);

                        

                        chatMessages.appendChild(summaryDiv);

                        chatMessages.scrollTop = chatMessages.scrollHeight;

                    }

                    

                    // Save results to server

                    try {

                        await fetch(`/api/ia-results?type=${type}&client_id=${currentClientId}`, {

                            method: "POST",

                            headers: { "Content-Type": "application/json" },

                            body: JSON.stringify({

                                extraction_html: reportData.extraction_html || "",

                                ai_summary: reportData.ai_summary || ""

                            })

                        });

                    } catch(e) { console.error("Failed to save IA results", e); }



                }

                

            } catch(e) {

                console.error("Error in IA flow:", e);

                const resultsPanel = document.getElementById("ia-results-panel");

                if (resultsPanel) {

                    resultsPanel.classList.remove("hidden");

                    resultsPanel.innerHTML = `<div class="text-error text-sm p-3"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Erro de conexão: ${e.message}</div>`;

                }

            }

            

            btnExtract.innerHTML = '<i class="fa-solid fa-play mr-2"></i> Gerar IA';

            btnExtract.disabled = false;

        });

    }



    // Bind chat events

    const btnSendChat = document.getElementById("btn-send-chat");

    const chatInputEl = document.getElementById("ia-chat-input");

    

    async function sendChatFromPanel() {

        if (!chatInputEl) return;

        const text = chatInputEl.value.trim();

        if (!text) return;

        

        const chatMessages = document.getElementById("ia-chat-messages");

        if (!chatMessages) return;

        

        // Add user message

        const userDiv = document.createElement("div");

        userDiv.className = "flex items-start gap-3 w-10/12 self-end flex-row-reverse";

        userDiv.innerHTML = `

            <div class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0 shadow-sm">

                <span class="material-symbols-outlined text-on-surface-variant text-[16px]">person</span>

            </div>

            <div class="p-3 rounded-2xl shadow-sm text-sm bg-primary-container text-on-primary-container rounded-tr-none">

                ${text}

            </div>`;

        chatMessages.appendChild(userDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        chatInputEl.value = "";

        

        try {

            const res = await fetch("/api/chat-ia", {

                method: "POST",

                headers: {"Content-Type": "application/json"},

                body: JSON.stringify({ message: text, type: type, client_id: currentClientId })

            });

            const data = await res.json();

            const aiText = data.response || data.response_html || data.error || "Sem resposta";

            

            const aiDiv = document.createElement("div");

            aiDiv.className = "flex items-start gap-3 w-10/12";

            aiDiv.innerHTML = `

                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">

                    <span class="material-symbols-outlined text-on-primary text-[16px]">robot_2</span>

                </div>

                <div class="p-3 rounded-2xl shadow-sm text-sm bg-white text-on-surface border border-outline-variant/20 rounded-tl-none">

                    ${aiText}

                </div>`;

            chatMessages.appendChild(aiDiv);

            chatMessages.scrollTop = chatMessages.scrollHeight;

        } catch(e) {

            console.error("Chat error:", e);

        }

    }

    

    if (btnSendChat) {

        btnSendChat.addEventListener("click", sendChatFromPanel);

    }

    if (chatInputEl) {

        chatInputEl.addEventListener("keypress", (e) => {

            if(e.key === "Enter") sendChatFromPanel();

        });

    }



    // Auto-load cached results if available

    setTimeout(async () => {

        try {

            const reportUrl = `/api/report-ia?type=${type}&client_id=${currentClientId}&category=${encodeURIComponent(currentCategory)}`;

            const reportRes = await fetch(reportUrl);

            const reportData = await reportRes.json();

            if (reportData.success && reportData.extraction_html) {

                const resultsPanel = document.getElementById("ia-results-panel");

                const chatMessages = document.getElementById("ia-chat-messages");

                if (resultsPanel) {

                    resultsPanel.classList.remove("hidden");

                    resultsPanel.innerHTML = reportData.extraction_html;

                }

                if (chatMessages && reportData.ai_summary) {

                    // Check if already populated to avoid duplicates

                    const summarySub = reportData.ai_summary ? reportData.ai_summary.substring(0, 50) : "";

                    if (summarySub && !chatMessages.innerHTML.includes(summarySub)) {

                        const summaryDiv = document.createElement("div");

                        summaryDiv.className = "flex items-start gap-3 w-10/12";

                        summaryDiv.innerHTML = `

                            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">

                                <span class="material-symbols-outlined text-on-primary text-[16px]">robot_2</span>

                            </div>

                            <div class="p-3 rounded-2xl shadow-sm text-sm bg-white text-on-surface border border-outline-variant/20 rounded-tl-none">

                                ${reportData.ai_summary}

                            </div>`;

                        chatMessages.appendChild(summaryDiv);

                        chatMessages.scrollTop = chatMessages.scrollHeight;

                    }

                }

            }

        } catch (e) {

            console.error("Failed to auto-load IA results", e);

        }

    }, 100);

}




// ==========================================
// MULTI-COMPANY & RULE GROUPING HELPER LOGIC
// ==========================================
let activeCompanyGroupId = null;

function getExtractedCompanies() {
    const cat = currentCategory || "Folha de Pagamento";
    if (!formState[cat]) formState[cat] = {};
    
    if (formState[cat]._companiesList && Array.isArray(formState[cat]._companiesList) && formState[cat]._companiesList.length > 0) {
        return formState[cat]._companiesList.map((c, idx) => {
            if (typeof c === "string") return { id: `comp_${idx + 1}`, name: c.trim() };
            return { id: c.id || `comp_${idx + 1}`, name: c.name || `Empresa ${idx + 1}` };
        }).filter(c => c.name.length > 0);
    }

    if (!formState[cat]["Dados da Empresa"]) return [];
    const state = formState[cat]["Dados da Empresa"];
    let gridData = [];
    for (const key of Object.keys(state)) {
        if (Array.isArray(state[key])) {
            gridData = state[key];
            break;
        }
    }
    
    const list = [];
    gridData.forEach((row, idx) => {
        let name = row["Razão Social"] || row["Empresa"] || row["Nome"] || row["Razao Social"];
        if (!name && typeof row === "object") {
            const val = Object.values(row).find(v => typeof v === "string" && v.trim().length > 1);
            if (val) name = val.trim();
        }
        if (name && typeof name === "string" && name.trim()) {
            list.push({ id: `comp_${idx + 1}`, name: name.trim() });
        }
    });

    return list;
}

function getCompanyGroups() {
    const cat = currentCategory || "Folha de Pagamento";
    if (!formState[cat]) formState[cat] = {};
    const companies = getExtractedCompanies();
    
    if (!formState[cat]._companyGroups || !Array.isArray(formState[cat]._companyGroups) || formState[cat]._companyGroups.length === 0) {
        if (companies.length > 1) {
            formState[cat]._companyGroups = [
                {
                    id: "group_1",
                    name: "Grupo 1 (Regra Padrão)",
                    companyIds: companies.map(c => c.id)
                }
            ];
        } else {
            formState[cat]._companyGroups = [];
        }
    } else {
        const validIds = new Set(companies.map(c => c.id));
        formState[cat]._companyGroups.forEach(g => {
            g.companyIds = g.companyIds.filter(id => validIds.has(id));
        });
        const assignedIds = new Set(formState[cat]._companyGroups.flatMap(g => g.companyIds));
        companies.forEach(c => {
            if (!assignedIds.has(c.id) && formState[cat]._companyGroups.length > 0) {
                formState[cat]._companyGroups[0].companyIds.push(c.id);
            }
        });
    }
    return formState[cat]._companyGroups;
}

function getActiveSectionState(secTitle) {
    const cat = currentCategory || "Folha de Pagamento";
    if (!formState[cat]) formState[cat] = {};
    if (!formState[cat][secTitle]) formState[cat][secTitle] = {};

    return formState[cat][secTitle];
}

function renderCompanyGroupTabs(container) {
    return; // Disabled in favor of the new Profile dropdown system
    const cat = currentCategory || "Folha de Pagamento";
    const companies = getExtractedCompanies();
    const groups = getCompanyGroups();

    let isMultiEnabled = false;
    if (formState[cat] && formState[cat]._isMultiCompanyEnabled === true) {
        isMultiEnabled = true;
    } else if (formState[cat] && formState[cat]._isMultiCompanyEnabled === false) {
        isMultiEnabled = false;
    } else {
        isMultiEnabled = companies.length > 1;
    }

    if (!isMultiEnabled) return;

    if (!activeCompanyGroupId || !groups.find(g => g.id === activeCompanyGroupId)) {
        activeCompanyGroupId = groups.length > 0 ? groups[0].id : null;
    }
    if (!activeCompanyGroupId) return;

    const bar = document.createElement("div");
    bar.className = "company-groups-bar mb-6 p-4 bg-surface-container-low rounded-2xl border border-primary/20 shadow-sm flex flex-col gap-3";
    
    const titleDiv = document.createElement("div");
    titleDiv.className = "flex items-center justify-between";
    titleDiv.innerHTML = `
        <div class="flex items-center gap-2 font-bold text-sm text-primary">
            <i class="fa-solid fa-layer-group text-lg"></i>
            <span>Selecione o Grupo de Regras / Empresa para responder:</span>
        </div>
        <span class="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full">${companies.length} Empresas Cadastradas</span>
    `;
    bar.appendChild(titleDiv);

    const tabsDiv = document.createElement("div");
    tabsDiv.className = "flex flex-wrap gap-2";

    groups.forEach(group => {
        const btn = document.createElement("button");
        btn.type = "button";
        const isActive = group.id === activeCompanyGroupId;
        
        const groupCompanyNames = companies
            .filter(c => group.companyIds.includes(c.id))
            .map(c => c.name)
            .join(", ") || "Nenhuma empresa";

        btn.className = isActive
            ? "px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-primary text-on-primary shadow-md border border-primary"
            : "px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 bg-surface text-on-surface hover:bg-surface-variant border border-outline-variant/40";

        btn.innerHTML = `
            <i class="fa-solid ${isActive ? 'fa-circle-check' : 'fa-building'}"></i>
            <span>${group.name}</span>
            <span class="text-xs ${isActive ? 'opacity-90 bg-white/20' : 'bg-surface-container text-outline'} px-2 py-0.5 rounded-full font-normal">
                (${groupCompanyNames})
            </span>
        `;

        btn.onclick = () => {
            activeCompanyGroupId = group.id;
            updateStepView();
        };

        tabsDiv.appendChild(btn);
    });

    bar.appendChild(tabsDiv);
    container.appendChild(bar);
}

window.openMultiCompanyVideo = function() {
    let modal = document.getElementById('multiCompanyVideoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'multiCompanyVideoModal';
        modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] hidden';
        modal.innerHTML = `
            <div class="bg-surface p-4 rounded-xl max-w-2xl w-[90%] relative shadow-xl">
                <button onclick="window.closeMultiCompanyVideo()" class="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface transition-colors" title="Fechar">
                    <i class="fa-solid fa-xmark text-2xl"></i>
                </button>
                <h3 class="text-lg font-bold text-primary mb-4 pr-8"><i class="fa-solid fa-circle-play mr-2"></i>Inteligência Multi-Empresa & Grupos de Regras</h3>
                <video id="multiCompanyVideoPlayer" class="w-full rounded shadow bg-black" controls preload="none">
                    <source src="./videos/Inteligência_Multi-Empresa.mp4" type="video/mp4">
                    Seu navegador não suporta vídeos.
                </video>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
};

window.closeMultiCompanyVideo = function() {
    const modal = document.getElementById('multiCompanyVideoModal');
    if (modal) {
        modal.classList.add('hidden');
        const video = document.getElementById('multiCompanyVideoPlayer');
        if (video) video.pause();
    }
};

function renderCompanyGroupConfigurator(container) {
    return; // Disabled in favor of the new Profile system
    const cat = currentCategory || "Folha de Pagamento";
    if (!formState[cat]) formState[cat] = {};

    let companies = getExtractedCompanies();
    let groups = getCompanyGroups();

    const box = document.createElement("div");
    box.className = "group-config-box my-6 p-5 bg-surface-container-low rounded-2xl border-2 border-primary/20 shadow-sm flex flex-col gap-4";

    let isEnabled = false;
    if (formState[cat]._isMultiCompanyEnabled === true) {
        isEnabled = true;
    } else if (formState[cat]._isMultiCompanyEnabled === false) {
        isEnabled = false;
    } else {
        isEnabled = companies.length > 1;
    }

    box.innerHTML = `
        <div class="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <div class="flex items-center gap-2 font-bold text-base text-primary">
                <i class="fa-solid fa-building-user text-xl"></i>
                <span>Inteligência Multi-Empresa & Grupos de Regras</span>
            </div>
            <label class="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-all">
                <input type="checkbox" id="chk-enable-multi-company" class="form-checkbox text-primary rounded" ${isEnabled ? 'checked' : ''}>
                <span>Possuo mais de uma empresa/filial</span>
                <i class="fa-solid fa-circle-question ml-1 text-primary text-base hover:text-primary/80 transition-colors" onclick="event.preventDefault(); window.openMultiCompanyVideo()" title="Clique para ver o vídeo explicativo"></i>
            </label>
        </div>
        <p class="text-xs text-on-surface-variant">
            Ao ativar, você poderá cadastrar suas empresas/filiais e agrupá-las por regras de negócios idênticas. As etapas seguintes do formulário apresentarão abas por Grupo de Regras, evitando retrabalho.
        </p>
        <div id="multi-company-body" class="${isEnabled ? '' : 'hidden'} flex flex-col gap-5 mt-2">
            <div class="p-4 bg-surface rounded-xl border border-outline-variant/30 flex flex-col gap-3">
                <div class="flex items-center justify-between">
                    <label class="font-bold text-xs text-on-surface flex items-center gap-1.5">
                        <i class="fa-solid fa-list-check text-primary"></i> 1. Lista de Empresas / Filiais
                    </label>
                    <button type="button" id="btn-add-company-name" class="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-lg hover:bg-primary/20 transition-all flex items-center gap-1">
                        <i class="fa-solid fa-plus"></i> Adicionar Empresa
                    </button>
                </div>
                <div id="companies-inputs-list" class="flex flex-col gap-2"></div>
            </div>

            <div class="p-4 bg-surface rounded-xl border border-outline-variant/30 flex flex-col gap-3">
                <div class="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                    <label class="font-bold text-xs text-on-surface flex items-center gap-1.5">
                        <i class="fa-solid fa-layer-group text-primary"></i> 2. Agrupamento de Regras / Práticas
                    </label>
                    <button type="button" id="btn-add-company-group" class="bg-primary text-on-primary px-3 py-1 rounded-lg text-xs font-bold hover:bg-primary/90 flex items-center gap-1 transition-all">
                        <i class="fa-solid fa-plus"></i> Novo Grupo de Regras
                    </button>
                </div>
                <div id="company-groups-list" class="flex flex-col gap-3"></div>
            </div>
        </div>
    `;

    container.appendChild(box);

    const chkEnable = box.querySelector("#chk-enable-multi-company");
    const bodyDiv = box.querySelector("#multi-company-body");

    chkEnable.addEventListener("change", (e) => {
        formState[cat]._isMultiCompanyEnabled = e.target.checked;
        if (e.target.checked) {
            bodyDiv.classList.remove("hidden");
            if (!formState[cat]._companiesList || formState[cat]._companiesList.length === 0) {
                formState[cat]._companiesList = [
                    { id: "comp_1", name: "Empresa Matriz" },
                    { id: "comp_2", name: "Empresa Filial" }
                ];
            }
            saveDraft();
            renderCompaniesList();
            renderGroupRows();
        } else {
            bodyDiv.classList.add("hidden");
            saveDraft();
        }
    });

    const companiesListDiv = box.querySelector("#companies-inputs-list");
    const groupsListDiv = box.querySelector("#company-groups-list");

    function renderCompaniesList() {
        companiesListDiv.innerHTML = "";
        companies = getExtractedCompanies();
        if (companies.length === 0) {
            companies = [
                { id: "comp_1", name: "Empresa Matriz" },
                { id: "comp_2", name: "Empresa Filial" }
            ];
            formState[cat]._companiesList = companies;
        }

        companies.forEach((comp, cIdx) => {
            const row = document.createElement("div");
            row.className = "flex items-center gap-2";
            row.innerHTML = `
                <span class="text-xs font-bold text-outline w-6 text-center">${cIdx + 1}.</span>
                <input type="text" class="comp-name-input form-input text-xs font-semibold flex-1" value="${comp.name}" placeholder="Nome da Empresa / Localidade">
                ${companies.length > 1 ? `
                    <button type="button" class="btn-del-comp text-error hover:bg-error/10 p-1.5 rounded-lg text-xs transition-all">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                ` : ''}
            `;

            row.querySelector(".comp-name-input").addEventListener("input", (e) => {
                comp.name = e.target.value;
                if (!formState[cat]._companiesList) formState[cat]._companiesList = companies;
                saveDraft();
                renderGroupRows();
            });

            if (companies.length > 1) {
                row.querySelector(".btn-del-comp").addEventListener("click", () => {
                    companies.splice(cIdx, 1);
                    formState[cat]._companiesList = companies;
                    saveDraft();
                    renderCompaniesList();
                    renderGroupRows();
                });
            }

            companiesListDiv.appendChild(row);
        });
    }

    function renderGroupRows() {
        groupsListDiv.innerHTML = "";
        groups = getCompanyGroups();

        groups.forEach((group, gIdx) => {
            const row = document.createElement("div");
            row.className = "p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col gap-2.5 shadow-sm";

            const topRow = document.createElement("div");
            topRow.className = "flex items-center gap-2.5";
            topRow.innerHTML = `
                <input type="text" class="group-name-input form-input text-xs font-bold flex-1" value="${group.name}" placeholder="Nome do Grupo (ex: Grupo 1 - Regra Padrão)">
                ${groups.length > 1 ? `
                    <button type="button" class="btn-del-group text-error hover:bg-error/10 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                ` : ''}
            `;

            topRow.querySelector(".group-name-input").addEventListener("input", (e) => {
                group.name = e.target.value;
                saveDraft();
            });

            if (groups.length > 1) {
                topRow.querySelector(".btn-del-group").addEventListener("click", () => {
                    groups.splice(gIdx, 1);
                    saveDraft();
                    renderGroupRows();
                });
            }

            row.appendChild(topRow);

            const compSelection = document.createElement("div");
            compSelection.className = "flex flex-wrap items-center gap-2 bg-surface p-2.5 rounded-lg border border-outline-variant/20";
            compSelection.innerHTML = `<span class="text-xs font-bold text-outline mr-1">Empresas neste Grupo:</span>`;

            companies.forEach(comp => {
                const label = document.createElement("label");
                label.className = "flex items-center gap-1.5 cursor-pointer text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-container-low border border-outline-variant/30 hover:border-primary/50 transition-all";
                
                const isChecked = group.companyIds.includes(comp.id);
                label.innerHTML = `
                    <input type="checkbox" class="form-checkbox text-primary rounded" ${isChecked ? 'checked' : ''}>
                    <span>${comp.name}</span>
                `;

                label.querySelector("input").addEventListener("change", (e) => {
                    if (e.target.checked) {
                        groups.forEach(g => {
                            if (g !== group) {
                                g.companyIds = g.companyIds.filter(id => id !== comp.id);
                            }
                        });
                        if (!group.companyIds.includes(comp.id)) {
                            group.companyIds.push(comp.id);
                        }
                    } else {
                        group.companyIds = group.companyIds.filter(id => id !== comp.id);
                    }
                    saveDraft();
                    renderGroupRows();
                });

                compSelection.appendChild(label);
            });

            row.appendChild(compSelection);
            groupsListDiv.appendChild(row);
        });
    }

    if (isEnabled) {
        renderCompaniesList();
        renderGroupRows();
    }

    box.querySelector("#btn-add-company-name").addEventListener("click", () => {
        companies = getExtractedCompanies();
        const newCompId = `comp_${Date.now()}`;
        companies.push({ id: newCompId, name: `Nova Empresa ${companies.length + 1}` });
        formState[cat]._companiesList = companies;
        saveDraft();
        renderCompaniesList();
        renderGroupRows();
    });

    box.querySelector("#btn-add-company-group").addEventListener("click", () => {
        groups = getCompanyGroups();
        const newGroupIdx = groups.length + 1;
        groups.push({
            id: `group_${Date.now()}`,
            name: `Grupo ${newGroupIdx} (Regra Específica)`,
            companyIds: []
        });
        saveDraft();
        renderGroupRows();
    });
}

function createItemEditActions(item, isLegacy) {
    isLegacy = isLegacy || false;
    const origIdx = (item && item.originalIndex !== undefined) ? item.originalIndex : -1;

    const bar = document.createElement("div");
    bar.className = "edit-action-bar";
    bar.style.cssText = "width:100%;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;padding:8px 10px;margin-bottom:8px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.2);border-radius:10px;box-sizing:border-box;pointer-events:auto !important;position:relative !important;z-index:999 !important;";

    const label = document.createElement("span");
    label.style.cssText = "font-size:11px;font-weight:700;color:#6366f1;display:flex;align-items:center;gap:5px;";
    label.innerHTML = '<i class="fa-solid fa-sliders"></i> Edição do Elemento';

    const btnGroup = document.createElement("div");
    btnGroup.style.cssText = "display:flex;gap:5px;flex-wrap:wrap;align-items:center;";

    function mkBtn(label, icon, bgColor, textColor, clickHandler) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.style.cssText = "display:inline-flex;align-items:center;gap:5px;padding:4px 10px;font-size:11px;font-weight:700;border:none;border-radius:7px;cursor:pointer;background:" + bgColor + ";color:" + textColor + ";pointer-events:auto !important;position:relative !important;z-index:1000 !important;";
        btn.innerHTML = '<i class="fa-solid ' + icon + '"></i> ' + label;
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Action button clicked:", label);
            try {
                clickHandler();
            } catch (err) {
                console.error("Error in clickHandler:", err);
                alert("Erro ao executar ação: " + err.message);
            }
        });
        return btn;
    }

    // Move Up
    btnGroup.appendChild(mkBtn("Subir", "fa-arrow-up", "#f1f5f9", "#374151", async function() {
        const sec = formSchema.filter(s => s.type === currentCategory)[currentStepIndex];
        if (!sec || !sec.content) return;
        const realIdx = sec.content.findIndex(i => i === item || (i.text && item.text && i.text === item.text) || (i.titleText && item.titleText && i.titleText === item.titleText));
        if (realIdx <= 0) return;
        const tmp = sec.content[realIdx];
        sec.content[realIdx] = sec.content[realIdx - 1];
        sec.content[realIdx - 1] = tmp;
        await saveSchemaToServer();
    }));

    // Move Down
    btnGroup.appendChild(mkBtn("Descer", "fa-arrow-down", "#f1f5f9", "#374151", async function() {
        const sec = formSchema.filter(s => s.type === currentCategory)[currentStepIndex];
        if (!sec || !sec.content) return;
        const realIdx = sec.content.findIndex(i => i === item || (i.text && item.text && i.text === item.text) || (i.titleText && item.titleText && i.titleText === item.titleText));
        if (realIdx < 0 || realIdx >= sec.content.length - 1) return;
        const tmp = sec.content[realIdx];
        sec.content[realIdx] = sec.content[realIdx + 1];
        sec.content[realIdx + 1] = tmp;
        await saveSchemaToServer();
    }));

    // Edit
    btnGroup.appendChild(mkBtn("Editar", "fa-pen", "#6366f1", "#ffffff", function() {
        const sec = formSchema.filter(s => s.type === currentCategory)[currentStepIndex];
        let realIdx = -1;
        let realItem = null;
        if (sec && sec.content) {
            realIdx = sec.content.findIndex(i => i === item || (i.text && item.text && i.text === item.text) || (i.titleText && item.titleText && i.titleText === item.titleText));
            if (realIdx >= 0) realItem = sec.content[realIdx];
        }
        if (isLegacy || (realItem && realItem.element === "table")) {
            openLegacyEditor(realIdx >= 0 ? realIdx : origIdx, realItem || item);
        } else {
            openQuestionEditor(realIdx >= 0 ? realIdx : origIdx, realItem || item);
        }
    }));

    // Delete
    btnGroup.appendChild(mkBtn("Excluir", "fa-trash", "#fee2e2", "#dc2626", function() {
        showConfirmModal("Tem certeza que deseja excluir este item?", async function() {
            const sections = getCategorySections();
            const sec = sections[currentStepIndex];
            if (sec && sec.content) {
                const targetIdx = sec.content.findIndex(i => i === item || (i.text && item.text && i.text === item.text) || (i.titleText && item.titleText && i.titleText === item.titleText));
                if (targetIdx >= 0) {
                    sec.content.splice(targetIdx, 1);
                    await saveSchemaToServer();
                } else if (origIdx >= 0 && origIdx < sec.content.length) {
                    sec.content.splice(origIdx, 1);
                    await saveSchemaToServer();
                }
            }
        });
    }));

    bar.appendChild(label);
    bar.appendChild(btnGroup);
    return bar;
}

function formatarCPFInput(val) {
    if (!val) return "";
    let digits = val.toString().replace(/\D/g, "");
    if (digits.length > 11) digits = digits.slice(0, 11);
    if (digits.length > 9) {
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    } else if (digits.length > 6) {
        return digits.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    } else if (digits.length > 3) {
        return digits.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    }
    return digits;
}

function extrairCamposResponsavelLegado(raw) {
    let nome = "", cpf = "", email = "";
    if (typeof raw === "string" && raw.trim()) {
        const partes = raw.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
        partes.forEach(p => {
            if (p.includes("@") && !email) {
                email = p;
            } else if (/\d{3}/.test(p) && !cpf) {
                cpf = formatarCPFInput(p);
            } else if (!nome) {
                nome = p;
            }
        });
    }
    return { nome, cpf: formatarCPFInput(cpf), email };
}

function renderConsultorEmailCard(container) {
    if (!container) return;
    const existing = container.querySelector(".consultor-responsavel-card");
    if (existing) existing.remove();

    const emailVal = window.consultorEmail || (localStorage.getItem("gaia_consultor_email_" + (currentClientId || "cli_default")) || "");
    const isLocked = isCurrentClientLocked && !isEditMode;

    const card = document.createElement("div");
    card.className = "consultor-responsavel-card mb-6 p-5 md:p-6 bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/70 rounded-2xl border border-blue-200/80 shadow-sm transition-all";
    card.innerHTML = `
        <div class="flex items-start md:items-center justify-between gap-4 mb-3 pb-3 border-b border-blue-100">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <i class="fa-solid fa-headset text-lg"></i>
                </div>
                <div>
                    <h3 class="text-sm md:text-base font-bold text-slate-800 tracking-tight">Consultor Apdata Responsável</h3>
                    <p class="text-[11px] text-slate-500">Notificação automática ao finalizar o formulário</p>
                </div>
            </div>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${emailVal ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                <span class="w-2 h-2 rounded-full ${emailVal ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}"></span>
                <span id="consultor-status-pill">${emailVal ? 'Consultor Vinculado' : 'Aguardando E-mail'}</span>
            </span>
        </div>
        <p class="text-xs text-slate-600 mb-4 leading-relaxed">
            Informe ou confirme o e-mail do consultor Apdata responsável pela sua implantação. Ao clicar em <strong>Finalizar</strong>, o sistema enviará automaticamente uma notificação a este e-mail informando que as respostas estão concluídas.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i class="fa-regular fa-envelope"></i>
                </div>
                <input type="email" 
                       id="input-consultor-email" 
                       class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none shadow-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                       placeholder="ex: consultor@apdata.com.br" 
                       value="${escapeHtml(emailVal)}" 
                       ${isLocked ? 'disabled' : ''}>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center gap-1.5 self-center sm:self-auto">
                <i class="fa-solid fa-circle-info text-blue-500"></i>
                <span>Parâmetro na URL: <code>&email_consultor=...</code></span>
            </div>
        </div>
    `;

    const inputEmail = card.querySelector("#input-consultor-email");
    if (inputEmail && !isLocked) {
        inputEmail.addEventListener("input", (e) => {
            const val = e.target.value.trim();
            window.consultorEmail = val;
            if (currentClientId) {
                localStorage.setItem("gaia_consultor_email_" + currentClientId, val);
            }
            if (window.currentUser) {
                window.currentUser.consultor_email = val;
            }
            updateConsultorBadge();
            const pill = card.querySelector("#consultor-status-pill");
            const pillContainer = pill ? pill.parentElement : null;
            if (pill && pillContainer) {
                if (val && val.includes("@")) {
                    pill.textContent = "Consultor Vinculado";
                    pillContainer.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200";
                    const dot = pillContainer.querySelector("span:first-child");
                    if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-500";
                } else {
                    pill.textContent = "Aguardando E-mail";
                    pillContainer.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200";
                    const dot = pillContainer.querySelector("span:first-child");
                    if (dot) dot.className = "w-2 h-2 rounded-full bg-amber-500 animate-pulse";
                }
            }
        });
    }

    container.appendChild(card);
}

function renderFormContent(section) {

    const btnAi = document.getElementById("btn-open-ia-modal");

    if (btnAi) btnAi.style.display = "none";



    
    dynamicForm.innerHTML = "";
    if (isEditMode) {
        const banner = document.createElement("div");
        banner.className = "mb-6 p-4 rounded-2xl flex items-center justify-between border shadow-sm " + 
            (currentClientId ? "bg-amber-500/10 border-amber-500/30 text-amber-900" : "bg-primary/10 border-primary/30 text-primary");
        
        let clientName = "Todos os Clientes (Modelo Global)";
        if (currentClientId) {
            const selectEl = document.getElementById("client-selector");
            if (selectEl && selectEl.selectedOptions && selectEl.selectedOptions[0]) {
                clientName = selectEl.selectedOptions[0].text;
            } else {
                clientName = currentClientId;
            }
        }
        
        banner.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fa-solid ${currentClientId ? 'fa-user-pen text-amber-600' : 'fa-globe text-primary'} text-2xl"></i>
                <div>
                    <strong class="block text-sm font-bold">${currentClientId ? 'Modo de Edição Exclusiva por Cliente' : 'Modo de Edição do Modelo Global'}</strong>
                    <span class="text-xs opacity-90">${currentClientId ? 'As alterações efetuadas nesta tela serão salvas EXCLUSIVAMENTE para o cliente: <b>' + clientName + '</b>' : 'As alterações efetuadas nesta tela serão salvas como MODELO PADRÃO para todos os clientes.'}</span>
                </div>
            </div>
        `;
        dynamicForm.appendChild(banner);
    }
    if (isCurrentClientLocked && !isEditMode) {
        const lockBanner = document.createElement("div");
        lockBanner.className = "mb-6 p-4 rounded-2xl flex items-center justify-between border bg-error/10 border-error/30 text-error shadow-sm";
        lockBanner.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fa-solid fa-lock text-error text-2xl"></i>
                <div>
                    <strong class="block text-sm font-bold">Formulário Finalizado e Bloqueado</strong>
                    <span class="text-xs opacity-90">Este formulário foi finalizado e está bloqueado para edições. Caso precise efetuar correções, solicite o desbloqueio ao seu consultor.</span>
                </div>
            </div>
        `;
        dynamicForm.appendChild(lockBanner);
    }
    if (section.title === "Dados da Empresa") {
        renderCompanyGroupConfigurator(dynamicForm);
    } else if (section.title !== "Apresentação") {
        renderCompanyGroupTabs(dynamicForm);
    }

    if (section.title === "Apresentação" || section.title === "Dados da Empresa" || currentStepIndex === 0) {
        renderConsultorEmailCard(dynamicForm);
    }


    

    let targetContainer = dynamicForm;

    let rightColumn = null;

    

    // Setup Drawer pattern if this is the Sindicato section

    const title = section.title.toLowerCase();

    if (section.hasIA && section.iaType) {

        renderIAModal(section.iaType, section.title);

    }

    

    // Initialize section state if not exists

    if (!formState[currentCategory]) formState[currentCategory] = {};

    if (!formState[currentCategory][section.title]) formState[currentCategory][section.title] = {};

    

    const sectionState = getActiveSectionState(section.title);

    

    // We will render paragraph info boxes and tables/form components

    let sectionCard = document.createElement("div");

    sectionCard.className = "form-section";

    

    const cardHeaderTitle = (section.title === "Dados da Empresa") ? "Dados da Empresa e Filiais" : "Configurações Gerais (Tabelas)";
    appendCardHeader(sectionCard, cardHeaderTitle, "config_tabelas", sectionState, false);

    

    // Append section-level hint if exists

    const sectionHint = getHintForText(section.title);

    if (sectionHint) {

        const hintDiv = document.createElement("div");

        hintDiv.className = "info-hint";

        hintDiv.innerHTML = `<i class="fa-solid fa-circle-info"></i><div><strong>Dica / Exemplo:</strong> ${sectionHint}</div>`;

        sectionCard.appendChild(hintDiv);

    }

    

    let hasInputs = false;

    

    // Pre-group consecutive elements & merge questions with immediate checkboxes

    const groupedContent = [];

    

    for (let i = 0; i < section.content.length; i++) {

        const item = JSON.parse(JSON.stringify(section.content[i]));

        item.originalIndex = i;

        

        if (item.element === "paragraph") {

            const cleanText = item.text.trim();

            const hasCheckboxes = /\(\s*\)|\[\s*\]/.test(cleanText);

            

            if (hasCheckboxes) {

                const regex = /(?:\(\s*\)|\[\s*\])\s*([^()\[\]\n\r]+)/g;

                const matches = [...cleanText.matchAll(regex)];

                let titleText = cleanText.split(/\(\s*\)|\[\s*\]/)[0].trim();

                

                const lastItem = groupedContent[groupedContent.length - 1];

                if (lastItem && lastItem.element === "checkbox_group" && (!titleText || titleText.length <= 3)) {

                    lastItem.matches.push(...matches);

                } else {

                    groupedContent.push({

                        originalIndex: i,

                        element: "checkbox_group",

                        titleText: titleText || "Opções de Seleção",

                        matches: matches

                    });

                }

            } else {

                // Look ahead to see if next item has checkboxes

                const isQuestion = /^[0-9]+(\.[0-9]+)*\s*[\.\-:]/.test(cleanText) || 

                                   cleanText.endsWith("?") || 

                                   cleanText.includes("___") || 

                                   cleanText.toLowerCase().includes("especificar:") ||

                                   cleanText.toLowerCase().includes("relacionar:") ||

                                   cleanText.toLowerCase().includes("descrever:");

                                   

                const nextItem = section.content[i + 1];

                if (isQuestion && nextItem && nextItem.element === "paragraph" && /\(\s*\)|\[\s*\]/.test(nextItem.text.trim())) {

                    // Combine question and checkboxes!

                    const nextCleanText = nextItem.text.trim();

                    const regex = /(?:\(\s*\)|\[\s*\])\s*([^()\[\]\n\r]+)/g;

                    const matches = [...nextCleanText.matchAll(regex)];

                    

                    groupedContent.push({

                        originalIndex: i,

                        element: "checkbox_group",

                        titleText: cleanText,

                        matches: matches

                    });

                    

                    i++; // skip next element

                } else {

                    groupedContent.push(item);

                }

            }

        } else {

            groupedContent.push(item);

        }

    }



    groupedContent.forEach((item, idx) => {

        if (item.element === "question_structured") {

            const questionContainer = document.createElement("div");
            const cleanText = item.text;
            const isFilled = sectionState[cleanText] !== undefined && sectionState[cleanText] !== "";

            if (item.responseType === "note") {
                questionContainer.className = "relative group";
                questionContainer.style.marginBottom = "0";
                
                if (isEditMode) {
                    const editBar = createItemEditActions(item, false);
                    questionContainer.appendChild(editBar);
                }

                let noteTitle = "Nota";
                let noteText = cleanText;
                
                if (cleanText.includes(":")) {
                    const firstColon = cleanText.indexOf(":");
                    noteTitle = cleanText.substring(0, firstColon).trim();
                    noteText = cleanText.substring(firstColon + 1).trim();
                }

                const prevItem = idx > 0 ? groupedContent[idx - 1] : null;
                const nextItem = idx < groupedContent.length - 1 ? groupedContent[idx + 1] : null;
                
                const isPrevNote = prevItem && prevItem.responseType === "note";
                const isNextNote = nextItem && nextItem.responseType === "note";

                const noteBlock = document.createElement("div");
                
                let borderRadius = "0 12px 12px 0";
                let padTop = "1.5rem";
                let padBottom = "1.5rem";
                let margBottom = isNextNote ? "0" : "2rem";
                let borderBottom = isNextNote ? "1px solid rgba(49, 46, 129, 0.08)" : "none";
                
                if (isPrevNote && isNextNote) {
                    borderRadius = "0";
                    padTop = "1rem";
                    padBottom = "1rem";
                } else if (isPrevNote) {
                    borderRadius = "0 0 12px 0";
                    padTop = "1rem";
                } else if (isNextNote) {
                    borderRadius = "0 12px 0 0";
                    padBottom = "1rem";
                }

                let borderLeftColor = noteTitle.toLowerCase().includes("dctf-web") ? "#d32f2f" : "var(--primary)";

                noteBlock.style.cssText = `background: rgba(49, 46, 129, 0.03); border-left: 4px solid ${borderLeftColor}; border-bottom: ${borderBottom}; padding: ${padTop} 1.5rem ${padBottom} 1.5rem; border-radius: ${borderRadius}; margin-bottom: ${margBottom};`;
                
                if (noteTitle) {
                    const titleP = document.createElement("p");
                    titleP.style.cssText = "font-weight: bold; margin-bottom: 0.5rem; color: var(--on-surface);";
                    if (noteTitle.toLowerCase().includes("dctf-web")) {
                        titleP.style.color = "#d32f2f";
                    }
                    titleP.textContent = noteTitle;
                    noteBlock.appendChild(titleP);
                }
                
                const textP = document.createElement("p");
                textP.style.cssText = "font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0; line-height: 1.6;";
                if (noteTitle.toLowerCase().includes("dctf-web")) {
                    textP.style.color = "#d32f2f";
                }
                textP.innerHTML = typeof formatLegacyText !== "undefined" ? formatLegacyText(noteText) : noteText;
                
                noteBlock.appendChild(textP);
                questionContainer.appendChild(noteBlock);

            } else {
                questionContainer.className = "form-section relative group";
                questionContainer.style.padding = "24px";
                questionContainer.style.marginBottom = "16px";

                appendCardHeader(questionContainer, cleanText, cleanText, sectionState, isFilled);

            if (item.responseType === "composite_table") {
                renderCompositeTable(questionContainer, item, sectionState, cleanText);
            }

                
                if (item.isRequired) {
                    questionContainer.style.cssText = "padding: 24px; margin-bottom: 16px; border: 2px solid #ef4444 !important; background-color: rgba(254, 242, 242, 0.7) !important; border-radius: 16px !important; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.15) !important;";
                    const reqBanner = document.createElement("div");
                    reqBanner.className = "mt-2 mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-extrabold shadow-sm";
                    reqBanner.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-600 text-sm"></i> <span>Atenção: Obrigatório o preenchimento</span>';
                    const headerFlex = questionContainer.querySelector(".card-header-flex");
                    if (headerFlex) {
                        headerFlex.appendChild(reqBanner);
                    } else {
                        questionContainer.insertBefore(reqBanner, questionContainer.firstChild);
                    }
                }

                if (isEditMode) {
                    const editBar = createItemEditActions(item, false);
                    questionContainer.appendChild(editBar);
                }
            }

            const isDirfQuestion = (item.id_pergunta === "dados-adicionais-responsavel-dirf") || 
                                   (cleanText && (cleanText.includes("Nome do Responsavel Legal (DIRF)") || cleanText.includes("Nome do Responsável Legal (DIRF)")));

            if (isDirfQuestion) {
                let nomeVal = sectionState["responsavel_dirf_nome"] || "";
                let cpfVal = sectionState["responsavel_dirf_cpf"] || "";
                let emailVal = sectionState["responsavel_dirf_email"] || "";

                if (!nomeVal && !cpfVal && !emailVal) {
                    const rawExisting = sectionState[cleanText] || (item.id_pergunta && sectionState[item.id_pergunta]) || "";
                    const parsed = extrairCamposResponsavelLegado(rawExisting);
                    nomeVal = parsed.nome;
                    cpfVal = parsed.cpf;
                    emailVal = parsed.email;
                    if (nomeVal) sectionState["responsavel_dirf_nome"] = nomeVal;
                    if (cpfVal) sectionState["responsavel_dirf_cpf"] = cpfVal;
                    if (emailVal) sectionState["responsavel_dirf_email"] = emailVal;
                }

                const dirfContainer = document.createElement("div");
                dirfContainer.className = "mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-3";
                dirfContainer.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <i class="fa-solid fa-user text-indigo-500 text-xs"></i> Nome do Responsável Legal (DIRF)
                            </label>
                            <input type="text" 
                                id="input-dirf-nome" 
                                class="form-input text-sm py-2 px-3 w-full rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 shadow-2xs transition-all" 
                                placeholder="Nome completo..." 
                                value="${(nomeVal || '').replace(/"/g, '&quot;')}" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <i class="fa-solid fa-id-card text-emerald-500 text-xs"></i> CPF do Responsável Legal (DIRF)
                            </label>
                            <input type="text" 
                                id="input-dirf-cpf" 
                                maxlength="14"
                                class="form-input text-sm py-2 px-3 w-full rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 font-mono shadow-2xs transition-all" 
                                placeholder="000.000.000-00" 
                                value="${(cpfVal || '').replace(/"/g, '&quot;')}" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <i class="fa-solid fa-envelope text-blue-500 text-xs"></i> E-mail do Responsável Legal
                            </label>
                            <input type="email" 
                                id="input-dirf-email" 
                                class="form-input text-sm py-2 px-3 w-full rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 shadow-2xs transition-all" 
                                placeholder="nome@empresa.com.br" 
                                value="${(emailVal || '').replace(/"/g, '&quot;')}" />
                        </div>
                    </div>
                `;

                const inNome = dirfContainer.querySelector("#input-dirf-nome");
                const inCpf = dirfContainer.querySelector("#input-dirf-cpf");
                const inEmail = dirfContainer.querySelector("#input-dirf-email");

                const syncDirfState = () => {
                    const n = (inNome.value || "").trim();
                    const c = (inCpf.value || "").trim();
                    const e = (inEmail.value || "").trim();

                    sectionState["responsavel_dirf_nome"] = n;
                    sectionState["responsavel_dirf_cpf"] = c;
                    sectionState["responsavel_dirf_email"] = e;

                    const partes = [];
                    if (n) partes.push(n);
                    if (c) partes.push(c);
                    if (e) partes.push(e);
                    const compStr = partes.join(", ");
                    sectionState[cleanText] = compStr;
                    if (item.id_pergunta) {
                        sectionState[item.id_pergunta] = compStr;
                    }

                    saveDraft();
                };

                inNome.addEventListener("input", syncDirfState);
                inCpf.addEventListener("input", (e) => {
                    e.target.value = formatarCPFInput(e.target.value);
                    syncDirfState();
                });
                inEmail.addEventListener("input", syncDirfState);

                questionContainer.appendChild(dirfContainer);
            } else if (item.responseType === "text") {

                const isLongAnswer = true; // all text fields multiline

                if (isLongAnswer) {

                    const textarea = document.createElement("textarea");

                    textarea.className = "form-input mt-4";

                    textarea.style.width = "100%";

                    textarea.style.minHeight = "80px";

                    textarea.placeholder = "Escreva sua resposta aqui...";

                    textarea.value = sectionState[cleanText] || "";
if(item.responseType === "composite_table") { textarea.style.display = "none"; textarea.style.opacity = 0; }

                    textarea.style.overflow = "hidden";

                    textarea.style.resize = "none";

                    setTimeout(() => { textarea.style.height = "auto"; textarea.style.height = textarea.scrollHeight + "px"; }, 10);

                    textarea.addEventListener("input", (e) => {

                        e.target.style.height = "auto";

                        e.target.style.height = e.target.scrollHeight + "px";

                        sectionState[cleanText] = e.target.value;

                        saveDraft();

                    });

                    questionContainer.appendChild(textarea);

                } else {

                    const input = document.createElement("input");

                    input.type = "text";

                    input.className = "form-input mt-4";

                    input.style.width = "100%";

                    input.placeholder = "Escreva sua resposta aqui...";

                    input.value = sectionState[cleanText] || "";
if(item.responseType === "composite_table") { input.style.display = "none"; input.style.opacity = 0; }

                    input.addEventListener("input", (e) => {

                        sectionState[cleanText] = e.target.value;

                        saveDraft();

                    });

                    questionContainer.appendChild(input);

                }

            
            


            if (cleanText.includes("1.1. No Global Antares")) {
                const treeContainer = document.createElement("div");
                treeContainer.style.cssText = "margin-top: 20px; background: #f8fafc; padding: 20px; border-radius: 12px; overflow-x: auto; border: 1px solid #e2e8f0;";
                
                const empresasData = window.empresas || (typeof formState !== "undefined" && formState["Folha de Pagamento"] && formState["Folha de Pagamento"]["Dados da Empresa"] && formState["Folha de Pagamento"]["Dados da Empresa"]["custom_empresa_data"]) || [];
                
                if (!empresasData || empresasData.length === 0) {
                    treeContainer.innerHTML = "<p style='text-align:center; color:#6b7280; font-size:14px; margin:0;'>Nenhuma empresa cadastrada no item 2. Retorne ao item 'Dados da Empresa' para preencher.</p>";
                } else {
                    const treeStateKey = cleanText + "_folhas";
                    if (!sectionState[treeStateKey]) sectionState[treeStateKey] = {};
                    
                    const createNode = (text, bgColor, textColor) => {
                        const div = document.createElement('div');
                        div.style.cssText = "background: " + bgColor + "; color: " + textColor + "; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; text-align: center; white-space: nowrap; margin: 0 10px; z-index: 2; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.1);";
                        div.innerText = text;
                        return div;
                    };

                    const createLine = (height) => {
                        if (!height) height = "20px";
                        const div = document.createElement('div');
                        div.style.cssText = "width: 2px; height: " + height + "; background: #cbd5e1; margin: 0 auto; z-index: 1;";
                        return div;
                    };

                    const createFlexContainer = (direction) => {
                        if (!direction) direction = "column";
                        const div = document.createElement('div');
                        div.style.cssText = "display: flex; flex-direction: " + direction + "; align-items: center; justify-content: center; position: relative;";
                        return div;
                    };
                    
                    const tree = {};
                    empresasData.forEach((e) => {
                        const cont = e['field-continente'] || 'Não Informado';
                        const pais = e['field-pais'] || 'Não Informado';
                        const grupo = e['field-grupo-empresa'] || 'Não Informado';
                        const emp = e['field-razao-social'] || 'Empresa Sem Nome';
                        const loc = e['field-local'] || 'Matriz';
                        
                        if (!tree[cont]) tree[cont] = {};
                        if (!tree[cont][pais]) tree[cont][pais] = {};
                        if (!tree[cont][pais][grupo]) tree[cont][pais][grupo] = {};
                        if (!tree[cont][pais][grupo][emp]) tree[cont][pais][grupo][emp] = [];
                        if (!tree[cont][pais][grupo][emp].includes(loc)) tree[cont][pais][grupo][emp].push(loc);
                    });

                    const renderFolhas = (localKey, localContainer) => {
                        const folhasContainer = document.createElement('div');
                        folhasContainer.style.cssText = "display: flex; flex-direction: column; gap: 8px; margin-top: 10px; align-items: center;";
                        
                        const renderList = () => {
                            folhasContainer.innerHTML = '';
                            const folhas = sectionState[treeStateKey][localKey] || [];
                            
                            folhas.forEach((folha, idx) => {
                                const row = document.createElement('div');
                                row.style.cssText = "display: flex; align-items: center; gap: 4px;";
                                
                                const input = document.createElement('input');
                                input.type = 'text';
                                input.value = folha;
                                input.placeholder = 'Nome da Folha';
                                input.style.cssText = "width: 120px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; text-align: center;";
                                input.addEventListener('change', (e) => {
                                    sectionState[treeStateKey][localKey][idx] = e.target.value;
                                    saveDraft();
                                });
                                
                                const delBtn = document.createElement('button');
                                delBtn.innerHTML = '<i class="fas fa-times"></i>';
                                delBtn.style.cssText = "color: #ef4444; background: transparent; border: none; cursor: pointer; padding: 4px; font-size: 12px;";
                                delBtn.onclick = () => {
                                    sectionState[treeStateKey][localKey].splice(idx, 1);
                                    saveDraft();
                                    renderList();
                                };
                                
                                row.appendChild(input);
                                row.appendChild(delBtn);
                                folhasContainer.appendChild(row);
                            });
                            
                            const addBtn = document.createElement('button');
                            addBtn.innerText = "+ Nova Folha";
                            addBtn.style.cssText = "background: transparent; border: 1px dashed #94a3b8; color: #64748b; padding: 6px; border-radius: 4px; font-size: 12px; cursor: pointer; width: 120px; transition: all 0.2s;";
                            addBtn.onmouseover = () => { addBtn.style.background = "#f1f5f9"; };
                            addBtn.onmouseout = () => { addBtn.style.background = "transparent"; };
                            addBtn.onclick = () => {
                                if (!sectionState[treeStateKey][localKey]) sectionState[treeStateKey][localKey] = [];
                                sectionState[treeStateKey][localKey].push("");
                                saveDraft();
                                renderList();
                            };
                            folhasContainer.appendChild(addBtn);
                        };
                        renderList();
                        localContainer.appendChild(folhasContainer);
                    };

                    const mainWrapper = createFlexContainer("row");
                    mainWrapper.style.alignItems = "flex-start";
                    mainWrapper.style.gap = "40px";

                    Object.keys(tree).forEach((cont) => {
                        const contCol = createFlexContainer("column");
                        contCol.appendChild(createNode("Continente: " + cont, "#4f46e5", "white"));
                        
                        const paisesWrapper = createFlexContainer("row");
                        paisesWrapper.style.alignItems = "flex-start";
                        paisesWrapper.style.marginTop = "20px";
                        paisesWrapper.style.gap = "30px";
                        
                        Object.keys(tree[cont]).forEach((pais) => {
                            const paisCol = createFlexContainer("column");
                            paisCol.appendChild(createNode("País: " + pais, "#4338ca", "white"));
                            
                            const gruposWrapper = createFlexContainer("row");
                            gruposWrapper.style.alignItems = "flex-start";
                            gruposWrapper.style.marginTop = "20px";
                            gruposWrapper.style.gap = "20px";
                            
                            Object.keys(tree[cont][pais]).forEach((grupo) => {
                                const grupoCol = createFlexContainer("column");
                                grupoCol.appendChild(createNode("Grupo: " + grupo, "#3730a3", "white"));
                                
                                const empWrapper = createFlexContainer("row");
                                empWrapper.style.alignItems = "flex-start";
                                empWrapper.style.marginTop = "20px";
                                empWrapper.style.gap = "20px";
                                
                                Object.keys(tree[cont][pais][grupo]).forEach((emp) => {
                                    const empCol = createFlexContainer("column");
                                    empCol.appendChild(createNode(emp, "#312e81", "white"));
                                    
                                    const locWrapper = createFlexContainer("row");
                                    locWrapper.style.alignItems = "flex-start";
                                    locWrapper.style.marginTop = "20px";
                                    locWrapper.style.gap = "15px";
                                    
                                    tree[cont][pais][grupo][emp].forEach((loc) => {
                                        const locCol = createFlexContainer("column");
                                        const locNode = createNode(loc, "#e0e7ff", "#3730a3");
                                        locCol.appendChild(locNode);
                                        
                                        const uniqueKey = cont + "|" + pais + "|" + grupo + "|" + emp + "|" + loc;
                                        renderFolhas(uniqueKey, locCol);
                                        
                                        locWrapper.appendChild(locCol);
                                    });
                                    
                                    if(tree[cont][pais][grupo][emp].length > 0) {
                                        empCol.appendChild(createLine());
                                        empCol.appendChild(locWrapper);
                                    }
                                    empWrapper.appendChild(empCol);
                                });
                                
                                if(Object.keys(tree[cont][pais][grupo]).length > 0) {
                                    grupoCol.appendChild(createLine());
                                    grupoCol.appendChild(empWrapper);
                                }
                                gruposWrapper.appendChild(grupoCol);
                            });
                            
                            if(Object.keys(tree[cont][pais]).length > 0) {
                                paisCol.appendChild(createLine());
                                paisCol.appendChild(gruposWrapper);
                            }
                            paisesWrapper.appendChild(paisCol);
                        });
                        
                        if(Object.keys(tree[cont]).length > 0) {
                            contCol.appendChild(createLine());
                            contCol.appendChild(paisesWrapper);
                        }
                        mainWrapper.appendChild(contCol);
                    });

                    treeContainer.appendChild(mainWrapper);
                }
                
                questionContainer.appendChild(treeContainer);
            }

} else if (item.responseType === "dropdown") {
                const selectContainer = document.createElement("div");
                selectContainer.className = "mt-3 flex flex-col gap-3";
                const selectEl = document.createElement("select");
                selectEl.className = "w-full md:w-2/3 bg-surface border border-outline-variant rounded-lg px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all";
                selectEl.innerHTML = '<option value="">Selecione...</option>' + (item.options || []).map(o => '<option value="' + (o.label || o) + '">' + (o.label || o) + '</option>').join("");
                const currentVal = sectionState[cleanText] || "";
                selectEl.value = currentVal;
                const detailInput = document.createElement("textarea");
detailInput.style.overflow = "hidden";
detailInput.style.resize = "none";
detailInput.style.minHeight = "42px";
setTimeout(() => { detailInput.style.height = "auto"; detailInput.style.height = detailInput.scrollHeight + "px"; }, 10);

                detailInput.className = "w-full md:w-2/3 bg-surface border border-outline-variant rounded-lg px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all hidden";
                detailInput.placeholder = item.inputPlaceholder || "Especifique...";
                detailInput.value = sectionState[cleanText + "_detalhe"] || "";
                const checkTrigger = (val) => {
                    const triggers = item.triggerInputOn || ["Outros", "Outro", "Sim"];
                    if (triggers.includes(val)) {
                        detailInput.classList.remove("hidden");
                        setTimeout(() => { detailInput.style.height = "auto"; detailInput.style.height = detailInput.scrollHeight + "px"; }, 10);
                    } else {
                        detailInput.classList.add("hidden");
                        detailInput.value = "";
                        sectionState[cleanText + "_detalhe"] = "";
                    }
                };
                checkTrigger(currentVal);
                selectEl.onchange = (e) => {
                    sectionState[cleanText] = e.target.value;
                    checkTrigger(e.target.value);
                    if (typeof saveDraft === 'function') saveDraft(); else if (typeof saveFormRascunho === 'function') saveFormRascunho();
                    if (typeof updateProgressBar === 'function') updateProgressBar();
                };
                detailInput.oninput = (e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    sectionState[cleanText + "_detalhe"] = e.target.value;
                    if (typeof saveDraft === 'function') saveDraft(); else if (typeof saveFormRascunho === 'function') saveFormRascunho();
                    if (typeof updateProgressBar === 'function') updateProgressBar();
                };
                if (typeof isReadOnly !== 'undefined' && isReadOnly) { selectEl.disabled = true; detailInput.disabled = true; }
                selectContainer.appendChild(selectEl);
                selectContainer.appendChild(detailInput);
                questionContainer.appendChild(selectContainer);
            } else if (item.responseType === "checkbox") {

                const grid = document.createElement("div");

                grid.className = "form-grid mt-4";

                item.options.forEach((opt, optIdx) => {

                    const optId = `chk_${idx}_${optIdx}`;

                    

                    const container = document.createElement("div");

                    container.className = "flex flex-col gap-2";



                    const optWrap = document.createElement("label");

                    optWrap.htmlFor = optId;

                    const isChecked = sectionState[opt.label] === true;

                    optWrap.className = "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer w-full";

                    if (isChecked) {

                        optWrap.classList.add("bg-primary/5", "border-primary/30");

                    } else {

                        optWrap.classList.add("bg-surface", "border-outline-variant/30", "hover:border-primary/50", "hover:bg-surface-variant/50");

                    }

                    

                    const chk = document.createElement("input");

                    chk.type = "checkbox";

                    chk.id = optId;

                    chk.className = "custom-checkbox";

                    chk.checked = isChecked;

                    

                    const lblSpan = document.createElement("span");

                    lblSpan.className = "font-medium text-sm text-on-surface flex-1";

                    lblSpan.textContent = opt.label;

                    

                    optWrap.appendChild(chk);

                    optWrap.appendChild(lblSpan);

                    container.appendChild(optWrap);

                    

                    if (opt.hasTextInput) {

                        const txt = document.createElement("textarea");
txt.style.overflow = "hidden";
txt.style.resize = "none";
txt.style.minHeight = "42px";
setTimeout(() => { txt.style.height = "auto"; txt.style.height = txt.scrollHeight + "px"; }, 10);


                        txt.className = "form-input text-sm py-2 px-3 w-full transition-all border border-outline-variant rounded-lg " + (isChecked ? "" : "hidden");

                        txt.placeholder = "Especifique...";

                        txt.value = sectionState[opt.label + "_obs"] || "";

                        

                        chk.addEventListener("change", (e) => {

                            if (e.target.checked) {

                                optWrap.classList.add("bg-primary/5", "border-primary/30");

                                optWrap.classList.remove("bg-surface", "border-outline-variant/30", "hover:border-primary/50", "hover:bg-surface-variant/50");

                                txt.classList.remove("hidden");

                            } else {

                                optWrap.classList.remove("bg-primary/5", "border-primary/30");

                                optWrap.classList.add("bg-surface", "border-outline-variant/30", "hover:border-primary/50", "hover:bg-surface-variant/50");

                                txt.classList.add("hidden");

                                txt.value = "";

                                sectionState[opt.label + "_obs"] = "";

                            }

                            sectionState[opt.label] = e.target.checked;

                            saveDraft();

                        });

                        

                        txt.addEventListener("input", (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";

                            sectionState[opt.label + "_obs"] = e.target.value;

                            saveDraft();

                        });

                        container.appendChild(txt);

                    } else {

                        chk.addEventListener("change", (e) => {

                            if (e.target.checked) {

                                optWrap.classList.add("bg-primary/5", "border-primary/30");

                                optWrap.classList.remove("bg-surface", "border-outline-variant/30", "hover:border-primary/50", "hover:bg-surface-variant/50");

                            } else {

                                optWrap.classList.remove("bg-primary/5", "border-primary/30");

                                optWrap.classList.add("bg-surface", "border-outline-variant/30", "hover:border-primary/50", "hover:bg-surface-variant/50");

                            }

                            sectionState[opt.label] = e.target.checked;

                            saveDraft();

                        });

                    }

                    grid.appendChild(container);

                });

                questionContainer.appendChild(grid);

            } else if (item.responseType === "attachment") {
                const attachBox = document.createElement("div");
                attachBox.className = "mt-4 p-4 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/60 flex flex-col gap-3";

                const notice = document.createElement("div");
                notice.className = "text-xs text-amber-700 bg-amber-500/10 p-2.5 rounded-lg flex items-center gap-2 font-medium";
                notice.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-600"></i><span>Atenção: Limite de até 10MB por arquivo.</span>';
                attachBox.appendChild(notice);

                let savedFiles = sectionState[cleanText];
                // Migrate legacy single object to array
                if (savedFiles && !Array.isArray(savedFiles) && savedFiles.data) {
                    savedFiles = [savedFiles];
                    sectionState[cleanText] = savedFiles;
                }
                if (!Array.isArray(savedFiles)) {
                    savedFiles = [];
                    sectionState[cleanText] = savedFiles;
                }

                const fileControl = document.createElement("div");
                fileControl.className = "flex flex-col gap-3";

                // Render all saved files
                savedFiles.forEach((savedFile, fIndex) => {
                    const fileCard = document.createElement("div");
                    fileCard.className = "flex items-center justify-between p-3 bg-surface border border-outline-variant rounded-lg shadow-sm";
                    const sizeMB = (savedFile.size / (1024 * 1024)).toFixed(2);

                    fileCard.innerHTML = `
                        <div class="flex items-center gap-3 overflow-hidden">
                            <i class="fa-solid fa-file-lines text-primary text-2xl"></i>
                            <div class="truncate">
                                <span class="block text-sm font-bold text-on-surface truncate" title="${savedFile.name}">${savedFile.name}</span>
                                <span class="text-xs text-outline">${sizeMB} MB</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <a href="${savedFile.data}" download="${savedFile.name}" target="_blank" class="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors">
                                <i class="fa-solid fa-download"></i>
                            </a>
                            <button type="button" class="btn-remove-file px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    `;

                    fileCard.querySelector(".btn-remove-file").addEventListener("click", () => {
                        savedFiles.splice(fIndex, 1);
                        saveDraft();
                        initWizard();
                        updateStepView();
                    });

                    fileControl.appendChild(fileCard);
                });

                // Modern dropzone and trigger button (Lumina Precision)
                const dropzoneBtn = document.createElement("div");
                dropzoneBtn.className = "btn-hover-lift cursor-pointer p-4 rounded-xl border-2 border-dashed border-[#d2d5da] hover:border-[#1d1d1f] bg-white hover:bg-[#fafafa] flex items-center justify-center gap-3 transition-all text-xs font-semibold text-[#5f6368] hover:text-[#1d1d1f] shadow-xs mt-2";
                dropzoneBtn.innerHTML = `
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-[#0066cc] flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-cloud-arrow-up text-base"></i>
                    </div>
                    <div class="text-left">
                        <span class="block text-xs font-bold text-[#1d1d1f]">Clique para selecionar ou arraste o arquivo</span>
                        <span class="text-[11px] text-[#70757a] font-normal">Formatos suportados: PDF, XLSX, CSV, DOCX ou Imagens (máx. 10MB)</span>
                    </div>
                `;

                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.multiple = true;
                fileInput.style.display = "none";
                dropzoneBtn.addEventListener("click", () => {
                    if (typeof isReadOnly !== 'undefined' && isReadOnly) return;
                    fileInput.click();
                });

                fileInput.addEventListener("change", async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
                    let hasError = false;

                    // Read files asynchronously
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        if (file.size > maxSizeBytes) {
                            hasError = true;
                            continue;
                        }

                        const dataUrl = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (evt) => resolve(evt.target.result);
                            reader.readAsDataURL(file);
                        });

                        savedFiles.push({
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            data: dataUrl,
                            uploadedAt: new Date().toISOString()
                        });
                    }

                    if (hasError) {
                        if (typeof showAlertModal === "function") showAlertModal("Um ou mais arquivos excedem o limite de 10MB e foram ignorados.");
                        else alert("Um ou mais arquivos excedem o limite de 10MB e foram ignorados.");
                    }

                    saveDraft();
                    initWizard();
                    updateStepView();
                });

                if (typeof isReadOnly !== 'undefined' && isReadOnly) { 
                    fileInput.disabled = true; 
                    dropzoneBtn.classList.add("opacity-50", "cursor-not-allowed");
                }

                fileControl.appendChild(dropzoneBtn);
                fileControl.appendChild(fileInput);

                attachBox.appendChild(fileControl);
                questionContainer.appendChild(attachBox);
            }

            if (typeof appendRotina1215PreviewCard === 'function') {
                appendRotina1215PreviewCard(questionContainer, item, sectionState);
            }

            targetContainer.appendChild(questionContainer);

            

        } else if (item.element === "paragraph") {

            const cleanText = item.text.trim();

            

            // Check if it is a question or input field

            const isQuestion = /^[0-9]+(\.[0-9]+)*\s*[\.\-:]/.test(cleanText) || 

                               cleanText.endsWith("?") || 

                               cleanText.includes("___") || 

                               cleanText.toLowerCase().includes("especificar:") ||

                               cleanText.toLowerCase().includes("relacionar:") ||

                               cleanText.toLowerCase().includes("descrever:");



            if (isQuestion) {

                const questionContainer = document.createElement("div");

                questionContainer.className = "form-section relative group";

                questionContainer.style.padding = "24px";

                questionContainer.style.marginBottom = "16px";

                

    

                

                const isFilled = sectionState[cleanText] !== undefined && sectionState[cleanText] !== "";

                appendCardHeader(questionContainer, cleanText, cleanText, sectionState, isFilled);

            if (item.responseType === "composite_table") {
                renderCompositeTable(questionContainer, item, sectionState, cleanText);
            }


            if (item.isRequired) {
                questionContainer.style.cssText = "padding: 24px; margin-bottom: 16px; border: 2px solid #ef4444 !important; background-color: rgba(254, 242, 242, 0.7) !important; border-radius: 16px !important; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.15) !important;";
                const reqBanner = document.createElement("div");
                reqBanner.className = "mt-2 mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-extrabold shadow-sm";
                reqBanner.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-600 text-sm"></i> <span>Atenção: Obrigatório o preenchimento</span>';
                const headerFlex = questionContainer.querySelector(".card-header-flex");
                if (headerFlex) {
                    headerFlex.appendChild(reqBanner);
                } else {
                    questionContainer.insertBefore(reqBanner, questionContainer.firstChild);
                }
            }

                if (isEditMode) {
                    const editBar = createItemEditActions(item, false);
                    questionContainer.appendChild(editBar);
                }

                // Render Hint if exists

                const hintText = getHintForText(cleanText);

                if (hintText) {

                    const hintDiv = document.createElement("div");

                    hintDiv.className = "info-hint";

                    hintDiv.innerHTML = `<i class="fa-solid fa-circle-info"></i><div><strong>Dica / Exemplo:</strong> ${hintText}</div>`;

                    questionContainer.appendChild(hintDiv);

                }

                

                const isLongAnswer = true; // all text fields multiline

                                     

                if (isLongAnswer) {

                    const textarea = document.createElement("textarea");

                    textarea.className = "form-input";

                    textarea.style.width = "100%";

                    textarea.style.minHeight = "80px";

                    textarea.style.fontFamily = "var(--font-body)";

                    textarea.placeholder = "Escreva sua resposta aqui...";

                    textarea.value = sectionState[cleanText] || "";
if(item.responseType === "composite_table") { textarea.style.display = "none"; textarea.style.opacity = 0; }

                    textarea.style.overflow = "hidden";

                    textarea.style.resize = "none";

                    setTimeout(() => { textarea.style.height = "auto"; textarea.style.height = textarea.scrollHeight + "px"; }, 10);

                    textarea.addEventListener("input", (e) => {

                        e.target.style.height = "auto";

                        e.target.style.height = e.target.scrollHeight + "px";

                        sectionState[cleanText] = e.target.value;

                        saveDraft();

                        

                        // Check if we should collapse or keep state

                        if (e.target.value === "") {

                            questionContainer.classList.remove("collapsed");

                        }

                    });

                    questionContainer.appendChild(textarea);

                } else {

                    const input = document.createElement("input");

                    input.type = "text";

                    input.className = "form-input";

                    input.style.width = "100%";

                    input.placeholder = "Escreva sua resposta aqui...";

                    input.value = sectionState[cleanText] || "";
if(item.responseType === "composite_table") { input.style.display = "none"; input.style.opacity = 0; }

                    input.addEventListener("input", (e) => {

                        sectionState[cleanText] = e.target.value;

                        saveDraft();

                    });

                    questionContainer.appendChild(input);

                }

                

                targetContainer.appendChild(questionContainer);

            } else {

                const isNote = cleanText.includes("Orientações") || cleanText.includes("Importante") || cleanText.includes("Atenção");
                const questionContainer = document.createElement("div");
                questionContainer.className = "form-section relative group";
                

                if (!isNote) {

                    questionContainer.style.padding = "24px";

                    questionContainer.style.marginBottom = "16px";

                } else {

                    questionContainer.style.marginBottom = "16px";

                }






                if (isNote) {

                    const noteBox = document.createElement("div");

                    noteBox.className = "intro-card";

                    noteBox.innerHTML = `

                        <i class="fa-solid fa-circle-info"></i>

                        <div class="intro-card-content">

                            <h3>Informação Importante</h3>

                            <p>${formatLegacyText(cleanText)}</p>

                        </div>

                    `;

                    questionContainer.appendChild(noteBox);

                } else {

                    const p = document.createElement("p");

                    p.className = "paragraph-text";

                    p.style.marginBottom = "0";

                    p.style.fontSize = "14px";

                    p.style.color = "var(--text-secondary)";

                    p.innerHTML = formatLegacyText(cleanText);

                    questionContainer.appendChild(p);

                }

                if (isEditMode) {
                    const editBar = createItemEditActions(item, false);
                    questionContainer.appendChild(editBar);
                }

                if (typeof appendRotina1215PreviewCard === 'function') {
                    appendRotina1215PreviewCard(questionContainer, item, sectionState);
                }
                targetContainer.appendChild(questionContainer);

            }

        } else if (item.element === "checkbox_group") {

            

            const checkboxContainer = document.createElement("div");

            checkboxContainer.className = "form-section relative group";

            checkboxContainer.style.padding = "20px 24px";

            checkboxContainer.style.marginBottom = "16px";

            





            

            appendCardHeader(checkboxContainer, item.titleText, item.titleText || `checkbox_${idx}`, sectionState);
            if (item.isRequired) {
                checkboxContainer.style.cssText = "padding: 20px 24px; margin-bottom: 16px; border: 2px solid #ef4444 !important; background-color: rgba(254, 242, 242, 0.7) !important; border-radius: 16px !important; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.15) !important;";
                const reqBanner = document.createElement("div");
                reqBanner.className = "mt-2 mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-extrabold shadow-sm";
                reqBanner.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-600 text-sm"></i> <span>Atenção: Obrigatório o preenchimento</span>';
                const headerFlex = checkboxContainer.querySelector(".card-header-flex");
                if (headerFlex) {
                    headerFlex.appendChild(reqBanner);
                } else {
                    checkboxContainer.insertBefore(reqBanner, checkboxContainer.firstChild);
                }
            }
            if (isEditMode) {
                const editBar = createItemEditActions(item, false);
                checkboxContainer.appendChild(editBar);
            }
            
            

            

            // Render Hint if exists

            const hintText = getHintForText(item.titleText);

            if (hintText) {

                const hintDiv = document.createElement("div");

                hintDiv.className = "info-hint";

                hintDiv.innerHTML = `<i class="fa-solid fa-circle-info"></i><div><strong>Dica / Exemplo:</strong> ${hintText}</div>`;

                checkboxContainer.appendChild(hintDiv);

            }

            

            const grid = document.createElement("div");

            grid.className = "form-grid";

            

            item.matches.forEach((m, mIdx) => {

                const label = m[1].trim().replace(/_+$/, ""); // clean trailing underscores

                if (!label) return;

                

                const optionId = `flag_${idx}_${mIdx}`;

                const isChecked = sectionState[label] === true;

                

                const optionCard = document.createElement("div");

                optionCard.className = `option-card ${isChecked ? 'selected' : ''}`;

                optionCard.style.padding = "8px 12px";

                

                const checkbox = document.createElement("input");

                checkbox.type = "checkbox";

                checkbox.id = optionId;

                checkbox.checked = isChecked;

                

                checkbox.addEventListener("change", () => {

                    sectionState[label] = checkbox.checked;

                    saveDraft();

                    optionCard.classList.toggle("selected", checkbox.checked);

                });

                

                const optLabel = document.createElement("label");

                optLabel.setAttribute("for", optionId);

                optLabel.textContent = label;

                optLabel.style.fontSize = "13px";

                

                const hasTextInput = m[1].includes("___") || label.toLowerCase().includes("outro") || label.toLowerCase().includes("especificar");

                

                optionCard.appendChild(checkbox);

                optionCard.appendChild(optLabel);

                

                if (hasTextInput) {

                    const suffixInput = document.createElement("textarea");
suffixInput.style.overflow = "hidden";
suffixInput.style.resize = "none";
suffixInput.style.minHeight = "42px";
setTimeout(() => { suffixInput.style.height = "auto"; suffixInput.style.height = suffixInput.scrollHeight + "px"; }, 10);


                    suffixInput.style.marginLeft = "10px";

                    suffixInput.style.padding = "4px 8px";

                    suffixInput.style.border = "1px solid var(--border-color)";

                    suffixInput.style.borderRadius = "4px";

                    suffixInput.placeholder = "Especificar...";

                    suffixInput.value = sectionState[label + "_detalhe"] || "";

                    suffixInput.addEventListener("input", (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";

                        sectionState[label + "_detalhe"] = e.target.value;

                        saveDraft();

                    });

                    suffixInput.disabled = !isChecked;

                    checkbox.addEventListener("change", () => {

                        suffixInput.disabled = !checkbox.checked;

                    });

                    optionCard.appendChild(suffixInput);

                }

                

                grid.appendChild(optionCard);

            });

            

            checkboxContainer.appendChild(grid);

            targetContainer.appendChild(checkboxContainer);

        } else if (item.element === "table") {

            hasInputs = true;

            

            const tableContainer = document.createElement("div");

            tableContainer.className = "form-section relative group";

            tableContainer.style.padding = "24px";

            tableContainer.style.marginBottom = "16px";

            tableContainer.style.paddingTop = "24px";

            if (isEditMode) {
                const editBar = createItemEditActions(item, true);
                tableContainer.appendChild(editBar);
            }
            if (item.isRequired) {
                tableContainer.style.cssText = "padding: 24px; margin-bottom: 16px; padding-top: 24px; border: 2px solid #ef4444 !important; background-color: rgba(254, 242, 242, 0.7) !important; border-radius: 16px !important; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.15) !important;";
                const reqBanner = document.createElement("div");
                reqBanner.className = "mt-2 mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-extrabold shadow-sm";
                reqBanner.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-600 text-sm"></i> <span>Atenção: Obrigatório o preenchimento</span>';
                const headerFlex = tableContainer.querySelector(".card-header-flex");
                if (headerFlex) {
                    headerFlex.appendChild(reqBanner);
                } else {
                    tableContainer.insertBefore(reqBanner, tableContainer.firstChild);
                }
            }





            

            let tableType = item.type;

            let tableHeaders = item.headers;

            let tableRows = item.rows;

            

            if (tableType === "text_block") {

                if (tableRows[0] && tableRows[0].length > 2) {

                    tableType = "grid";

                    tableHeaders = tableRows[0];

                    tableRows = tableRows.slice(1);

                } else {

                    tableType = "form";

                }

            }

            

            if (tableType === "form") {

                // Table of inputs (2 columns: Label | Option/Value)

                const gridDiv = document.createElement("div");

                gridDiv.className = "form-grid";

                gridDiv.style.marginBottom = "24px";

                

                tableRows.forEach((row, rowIdx) => {

                    if (row.length < 2) return;

                    const label = row[0];

                    const rawVal = row[1] || "";

                    

                    const formGroup = document.createElement("div");

                    formGroup.className = "form-group";

                    

                    // If the label is long or has specific format, spans full width

                    if (label.length > 50 || rawVal.includes("(   )")) {

                        formGroup.className = "form-group form-group-full";

                    }

                    

                    const labelEl = document.createElement("label");

                    labelEl.textContent = label;

                    formGroup.appendChild(labelEl);

                    

                    // Parse if value has choices/options like (  ) Option1 (  ) Option2

                    if (rawVal.includes("(   )") || rawVal.includes("(  )")) {

                        const optionsGrid = document.createElement("div");

                        optionsGrid.className = "options-grid";

                        

                        // Split options by ( ) markers

                        const options = rawVal.split(/\(\s*\)/).map(opt => opt.strip ? opt.strip() : opt.trim()).filter(opt => opt);

                        

                        options.forEach(option => {

                            const optionId = `opt_${idx}_${rowIdx}_${option.replace(/[^a-zA-Z0-9]/g, '_')}`;

                            const isSelected = sectionState[label] === option;

                            

                            const optionCard = document.createElement("div");

                            optionCard.className = `option-card ${isSelected ? 'selected' : ''}`;

                            

                            const radio = document.createElement("input");

                            radio.type = "radio";

                            radio.name = `name_${idx}_${rowIdx}`;

                            radio.id = optionId;

                            radio.value = option;

                            radio.checked = isSelected;

                            

                            radio.addEventListener("change", () => {

                                sectionState[label] = option;

                                saveDraft();

                                // Toggle active visual state

                                optionCard.parentNode.querySelectorAll(".option-card").forEach(c => c.classList.remove("selected"));

                                optionCard.classList.add("selected");

                            });

                            

                            const optLabel = document.createElement("label");

                            optLabel.setAttribute("for", optionId);

                            optLabel.textContent = option;

                            

                            optionCard.appendChild(radio);

                            optionCard.appendChild(optLabel);

                            optionsGrid.appendChild(optionCard);

                        });

                        

                        formGroup.appendChild(optionsGrid);

                    } else {

                        // Standard Input

                        const input = document.createElement("input");

                        input.type = "text";

                        input.className = "form-input";

                        input.placeholder = "Preencha aqui...";

                        input.value = sectionState[label] || "";

                        

                        // Mask helper if label is CNPJ, E-mail or Telefone

                        if (label.toLowerCase().includes("cnpj")) {

                            input.placeholder = "00.000.000/0001-00";

                        } else if (label.toLowerCase().includes("e-mail") || label.toLowerCase().includes("email")) {

                            input.type = "email";

                            input.placeholder = "exemplo@empresa.com";

                        }

                        

                        input.addEventListener("input", (e) => {

                            sectionState[label] = e.target.value;

                            saveDraft();

                        });

                        

                        formGroup.appendChild(input);

                    }

                    

                    gridDiv.appendChild(formGroup);

                });

                

                tableContainer.appendChild(gridDiv);

                sectionCard.appendChild(tableContainer);

            } else if (tableType === "grid") {

                // Table of grid list (CNPJ, Razão Social, Endereço, etc)

                const gridTitle = tableHeaders.join(" / ");

                

                const tableSection = document.createElement("div");

                tableSection.className = "form-group form-group-full";

                tableSection.style.marginBottom = "24px";

                

                const gridLabel = document.createElement("label");

                gridLabel.textContent = tableHeaders[0] || "Tabela de Informações";

                tableSection.appendChild(gridLabel);

                

                const innerTableContainer = document.createElement("div");

                innerTableContainer.className = "grid-table-container";

                

                const table = document.createElement("table");

                table.className = "grid-table";

                

                // Header

                const thead = document.createElement("thead");

                const headerRow = document.createElement("tr");

                tableHeaders.forEach(h => {

                    const th = document.createElement("th");

                    th.textContent = h;

                    headerRow.appendChild(th);

                });

                // Action Header

                const thAction = document.createElement("th");

                thAction.style.width = "50px";

                headerRow.appendChild(thAction);

                thead.appendChild(headerRow);

                table.appendChild(thead);

                

                // Body

                const tbody = document.createElement("tbody");

                

                // Load existing or mock rows

                let gridData = sectionState[gridTitle] || [];

                if (!gridData.length) {

                    // Populate initial rows based on template rows

                    tableRows.forEach(r => {

                        const rowObj = {};

                        tableHeaders.forEach((h, colIdx) => {

                            rowObj[h] = r[colIdx] || "";

                        });

                        gridData.push(rowObj);

                    });

                    sectionState[gridTitle] = gridData;

                }

                

                function renderGridRows() {

                    tbody.innerHTML = "";

                    gridData.forEach((rowObj, rIdx) => {

                        const tr = document.createElement("tr");

                        if (rowObj._ai_filled) {

                            tr.classList.add("bg-primary-container", "border-l-4", "border-primary");

                            tr.title = "Preenchido automaticamente pela IA Copilot";

                        }

                        

                        tableHeaders.forEach(h => {

                            const td = document.createElement("td");

                            const input = document.createElement("input");

                            input.type = "text";

                            input.value = rowObj[h] || "";

                            if (rowObj._ai_filled) {

                                input.classList.add("font-semibold", "text-primary");

                            }

                            input.addEventListener("input", (e) => {

                                rowObj[h] = e.target.value;

                                if (rowObj._ai_filled) {

                                    delete rowObj._ai_filled; // Remove style if user edits

                                    renderGridRows();

                                }

                                saveDraft();

                            });

                            td.appendChild(input);

                            tr.appendChild(td);

                        });

                        

                        // Actions cell

                        const tdAction = document.createElement("td");

                        const btnDelete = document.createElement("button");
                        btnDelete.type = "button";

                        btnDelete.className = "btn-remove-row";

                        btnDelete.innerHTML = '<i class="fa-solid fa-trash-can"></i>';

                        btnDelete.addEventListener("click", () => {

                            gridData.splice(rIdx, 1);

                            saveDraft();

                            renderGridRows();

                        });

                        tdAction.appendChild(btnDelete);

                        tr.appendChild(tdAction);

                        

                        tbody.appendChild(tr);

                    });

                }

                

                renderGridRows();

                table.appendChild(tbody);

                innerTableContainer.appendChild(table);

                tableSection.appendChild(innerTableContainer);

                

                // Add row button

                const actionsDiv = document.createElement("div");

                actionsDiv.className = "table-actions";

                const btnAdd = document.createElement("button");
                btnAdd.type = "button";

                btnAdd.className = "btn btn-secondary btn-sm";

                btnAdd.type = "button";

                btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar Linha';

                btnAdd.addEventListener("click", () => {

                    const newRow = {};

                    tableHeaders.forEach(h => {

                        newRow[h] = "";

                    });

                    gridData.push(newRow);

                    saveDraft();

                    renderGridRows();

                });

                actionsDiv.appendChild(btnAdd);

                tableSection.appendChild(actionsDiv);

                

                tableContainer.appendChild(tableSection);

                sectionCard.appendChild(tableContainer);

            }

        } else if (item.element === "custom_empresa") {
            hasInputs = true;
            
            const container = document.createElement("div");
            container.className = "empresa-config-wrapper relative mt-2";
            
            const htmlDiv = document.createElement("div");
            
            if (!sectionState["custom_empresa_data"]) {
                sectionState["custom_empresa_data"] = [];
            }
            window.empresas = sectionState["custom_empresa_data"];
            
            htmlDiv.innerHTML = `
                <div id="toast-container"></div>
                <div class="header-actions">
                    <button class="btn btn-primary btn-hover-lift" onclick="openModal()"><i class="fas fa-file-import"></i> Importar Excel/CSV</button>
                    <button class="btn btn-hover-lift" style="background-color: #10b981; color: white; border-color: #10b981;" onclick="downloadTemplate()"><i class="fas fa-download"></i> Baixar Template</button>
                </div>
                <div id="companies-list"></div>
                <button class="btn btn-outline btn-hover-lift" style="width: 100%; border-style: dashed; margin-top: 1rem; padding: 12px;" onclick="addEmpresa()"><i class="fas fa-plus"></i> Adicionar Nova Empresa/Local</button>
                
                <!-- Import Modal -->
                <div class="modal-overlay" id="importModal">
                    <div class="modal">
                        <h2 class="title" style="font-size: 1.25rem;"><i class="fas fa-file-import"></i> Importar Dados da Empresa</h2>
                        <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 0.9rem;">
                            Faça o upload da planilha preenchida (.xlsx ou .csv) para importar os dados automaticamente.
                        </p>
                        
                        <div class="upload-area" onclick="document.getElementById('fileInput').click()" style="margin-top: 1.5rem;">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Clique para selecionar ou arraste o arquivo</h3>
                            <p style="color: var(--text-muted); font-size: 0.85rem;">Suporta .xlsx e .csv</p>
                            <input type="file" id="fileInput" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" style="display: none;" onchange="handleFileSelect(event)">
                        </div>
                        
                        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                            <button class="btn btn-outline btn-hover-lift" onclick="closeModal()" style="flex: 1;">Cancelar</button>
                            <button class="btn btn-primary btn-hover-lift" onclick="simulateImport()" style="flex: 1;"><i class="fas fa-cogs"></i> Processar Importação</button>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(htmlDiv);
            sectionCard.appendChild(container);
            
            setTimeout(() => {
                if (window.currentUser && window.currentUser.role === 'cliente') {
                    const btnGA = document.getElementById('btnExportGA');
                    if(btnGA) btnGA.style.display = 'none';
                }
                if (typeof window.renderEmpresasFromState === "function") {
                    window.renderEmpresasFromState();
                }
            }, 100);
        }

    });

    



    if (hasInputs) {
        if (section.title === "Dados da Empresa") {
            targetContainer.insertBefore(sectionCard, targetContainer.firstChild);
        } else {
            targetContainer.appendChild(sectionCard);
        }
    }

    

    // --- EDITOR MODE: Add Question ---

    if (isEditMode) {

        const btnAddQ = document.createElement("button");
        btnAddQ.type = "button";

        btnAddQ.className = "w-full py-4 mt-6 border-2 border-dashed border-primary/50 text-primary font-bold rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2";

        btnAddQ.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar Nova Pergunta / Elemento';

        btnAddQ.onclick = () => {
    console.log("Clicking Adicionar Nova Pergunta");
    try {
        openQuestionEditor(-1, -1);
    } catch (err) {
        console.error("Error in btnAddQ:", err);
        alert("Erro ao adicionar pergunta: " + err.message);
    }
};

        targetContainer.appendChild(btnAddQ);

    }

}





// Navigation Actions

btnPrevStep.addEventListener("click", () => {

    if (currentStepIndex > 0) {

        currentStepIndex--;

        updateStepView();

    }

});



btnNextStep.addEventListener("click", () => {
    const sections = getCategorySections();
    const section = sections[currentStepIndex];
    if (section) {
        const p = getSectionProgress(section, formState); // Usa a lógica já existente
        if (p.hasFields && p.missing > 0) {
            showAlertModal(`Não é possível avançar. Faltam ${p.missing} campo(s) obrigatório(s) nesta seção.\n\nPor favor, preencha todos os campos pendentes ou marque a opção 'Não se aplica' (Desconsiderar) na pergunta.`);
            return;
        }
    }
    advanceToNext();

    function advanceToNext() {
        if (currentStepIndex < sections.length - 1) {
            currentStepIndex++;
            updateStepView();
        } else {
            handleFormFinalization();
        }
    }
});



// Save to LocalStorage

function saveDraft() {
    try {
        const stateKey = 'gaia_state_' + (currentProfileId || currentClientId || 'default');
        localStorage.setItem(stateKey, JSON.stringify(formState));
    } catch(e) {}
    updateProgressBar();

    

    // Update step icon on sidebar dynamically

    const sections = getCategorySections();

    const section = sections[currentStepIndex];

    const sidebarItem = document.querySelector(`#sections-menu-list .step-item[data-index="${currentStepIndex}"]`);

    if (sidebarItem) {

        const isCompleted = isSectionComplete(section);

        const iconContainer = sidebarItem.querySelector(".step-status-icon");

        if (iconContainer) {

            if (isCompleted) {

                iconContainer.className = "fa-solid fa-circle-check step-status-icon completed";

            } else {

                iconContainer.className = "fa-regular fa-circle step-status-icon pending";

            }

        }

    }

}



btnSaveDraft.addEventListener("click", async () => {
    btnSaveDraft.disabled = true;
    const originalText = btnSaveDraft.textContent;
    btnSaveDraft.textContent = "Salvando...";

    saveDraft();
    const cloudSaved = await saveServerState();

    btnSaveDraft.disabled = false;
    btnSaveDraft.textContent = originalText;

    if (cloudSaved) {
        showAlertModal("Rascunho salvo com sucesso no navegador e sincronizado no SharePoint corporativo da Apdata!");
    } else {
        showAlertModal("Rascunho salvo com sucesso no seu computador local.");
    }
});



btnGenerateReport.addEventListener("click", () => {

    generatePrintableReport();

});



function generatePrintableReport() {

    let html = `

    <html>

    <head>

        <title>Relatório de Implantação - Global Antares</title>

        <style>

            body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; color: #333; margin: 0; padding: 40px; background: #fff; }

            .header { border-bottom: 3px solid #512b82; padding-bottom: 20px; margin-bottom: 30px; }

            .header h1 { color: #512b82; margin: 0 0 10px 0; font-size: 28px; }

            .header p { margin: 5px 0; color: #666; font-size: 14px; }

            h2 { color: #caa153; margin-top: 40px; font-size: 22px; border-bottom: 2px solid #caa153; padding-bottom: 5px; }

            h3 { color: #512b82; font-size: 18px; margin-top: 25px; margin-bottom: 15px; }

            .question-box { margin-bottom: 15px; page-break-inside: avoid; }

            .q-title { font-weight: bold; font-size: 14px; color: #444; margin-bottom: 5px; }

            .q-answer { padding: 12px; background: #f8f9fa; border-left: 4px solid #512b82; font-size: 14px; white-space: pre-wrap; word-wrap: break-word; color: #111; }

            .q-doubt { display: inline-block; background: #ffebee; color: #c62828; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 10px; vertical-align: middle; }

            .empty { color: #999; font-style: italic; }

            table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 13px; }

            th, td { border: 1px solid #dee2e6; padding: 8px 12px; text-align: left; }

            th { background: #512b82; color: #fff; font-weight: 500; }

            tr:nth-child(even) { background-color: #f8f9fa; }

            @media print {

                body { padding: 0; }

                .header { margin-top: 0; }

            }

        </style>

    </head>

    <body>

        <div class="header">

            <h1>Relatório de Preenchimento da Implantação</h1>

            <p><strong>Cliente:</strong> ${currentClientId || "Não selecionado"}</p>

            <p><strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-BR')}</p>

        </div>

    `;



    if (Object.keys(formState).length === 0) {

        html += `<p>Nenhum dado preenchido para este cliente.</p>`;

    }



    Object.keys(formState).forEach(cat => {

        html += `<h2>Categoria: ${cat}</h2>`;

        

        Object.keys(formState[cat]).forEach(sectionTitle => {

            html += `<h3>${sectionTitle}</h3>`;

            const answers = formState[cat][sectionTitle];

            

            let hasFields = false;

            function renderGroupObj(obj, prefix) {
                    Object.keys(obj).forEach(k => {
                        if (k.endsWith("_need_help")) return;
                        const val = obj[k];
                        if (val && typeof val === "object" && !Array.isArray(val) && val.data === undefined && val.size === undefined && val.name === undefined) {
                            let gName = "";
                            if (k === "_groupAnswers" || k === "Geral") {
                                gName = prefix;
                            } else {
                                let translatedName = k;
                                if (formState[cat] && Array.isArray(formState[cat]._companyGroups)) {
                                    const matched = formState[cat]._companyGroups.find(g => g.id === k);
                                    if (matched) translatedName = matched.name;
                                }
                                gName = prefix ? `${prefix} - ${translatedName}` : `${translatedName}`;
                            }
                            
                            const isPrintableTitle = gName && k !== "_groupAnswers" && k !== "Geral";
                            if (isPrintableTitle) html += `<h4 style="color:#512b82; margin: 10px 0 5px 0;">${gName}</h4>`;
                            html += `<div style="${isPrintableTitle ? 'margin-left:15px; border-left:2px solid #512b82; padding-left:10px;' : ''}">`;
                            renderGroupObj(val, isPrintableTitle ? gName : prefix);
                            html += `</div>`;
                            return;
                        }
                        
                        // Hide empty detalhe fields
                        if (k.endsWith("_detalhe") && (val === undefined || val === null || val === "")) return;
                        
                        hasFields = true;
                        const needsHelp = obj[k + "_need_help"] === true;
                        
                        html += `<div class="question-box">
                            <div class="q-title">${k} ${needsHelp ? '<span class="q-doubt">Solicitou Ajuda</span>' : ''}</div>`;
                        
                        if (Array.isArray(val)) {
                            if (val.length === 0) {
                                html += `<div class="q-answer empty">Tabela sem registros</div>`;
                            } else if (val[0] && typeof val[0] === 'object' && val[0].data && val[0].name) {
                                val.forEach(att => {
                                    const sizeMB = (att.size / (1024 * 1024)).toFixed(2);
                                    html += `<div class="q-answer"> <strong>Anexo:</strong> <a href="${att.data}" download="${att.name}" target="_blank" style="color: #512b82; text-decoration: underline;">${att.name}</a> (${sizeMB} MB)</div>`;
                                });
                            } else {
                                html += `<table><thead><tr>`;
                                const keys = Object.keys(val[0]);
                                keys.forEach(ck => html += `<th>${ck}</th>`);
                                html += `</tr></thead><tbody>`;
                                val.forEach(row => {
                                    html += `<tr>`;
                                    keys.forEach(ck => html += `<td>${String(row[ck] || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`);
                                    html += `</tr>`;
                                });
                                html += `</tbody></table>`;
                            }
                        } else {
                            if (val && typeof val === "object" && val.data) {
                                const sizeMB = (val.size / (1024 * 1024)).toFixed(2);
                                html += `<div class="q-answer"> <strong>Anexo Enviado:</strong> <a href="${val.data}" download="${val.name}" target="_blank" style="color: #512b82; font-weight: bold; text-decoration: underline;">${val.name}</a> (${sizeMB} MB)</div>`;
                            } else {
                                const cleanVal = (val === undefined || val === null || val === "") ? "Não preenchido" : String(val).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                html += `<div class="q-answer ${cleanVal === "Não preenchido" ? "empty" : ""}">${cleanVal}</div>`;
                            }
                        }
                        html += `</div>`;
                    });
                }
                renderGroupObj(answers, "");

            

            if (!hasFields) {

                html += `<p style="font-style:italic; color:#888; font-size:13px;">Seção sem preenchimentos registrados.</p>`;

            }

        });

    });



    html += `

        <script>

            window.onload = function() { 

                setTimeout(() => window.print(), 500); 

            }

        </script>

    </body>

    </html>`;



    const printWin = window.open('', '_blank');

    if (printWin) {

        printWin.document.open();

        printWin.document.write(html);

        printWin.document.close();

    } else {

        alert("O bloqueador de pop-ups impediu a abertura do relatório. Por favor, permita pop-ups para este site.");

    }

}



// Download JSON Backup

btnBackupDraft.addEventListener("click", () => {

    saveDraft();

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formState, null, 2));

    const downloadAnchor = document.createElement("a");

    downloadAnchor.setAttribute("href", dataStr);

    downloadAnchor.setAttribute("download", "rascunho_implantacao_ga.json");

    document.body.appendChild(downloadAnchor);

    downloadAnchor.click();

    downloadAnchor.remove();

});



// Trigger file input click for restore

btnRestoreDraft.addEventListener("click", () => {

    fileRestoreDraft.click();

});



// Restore backup from uploaded JSON file

fileRestoreDraft.addEventListener("change", (e) => {

    const file = e.target.files[0];

    if (!file) return;

    

    const reader = new FileReader();

    reader.onload = function(event) {

        try {

            const uploadedState = JSON.parse(event.target.result);

            formState = uploadedState;

            saveState();

            initWizard();

            showAlertModal("Rascunho restaurado com sucesso a partir do arquivo!");

        } catch (err) {

            showAlertModal("Erro ao ler o arquivo de backup. Certifique-se de que é um arquivo JSON de backup válido.");

            console.error(err);

        }

    };

    reader.readAsText(file);

});



// Progress Bar Calculations


function resolveProfileStateJS(profiles, profileId, baseState) {
    if (!baseState) baseState = {};
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return baseState;
    
    const state = profile.state || {};
    const parentId = profile.parent_id;
    
    let parentState;
    if (parentId === "none") {
        parentState = {};
    } else if (!parentId) {
        parentState = baseState;
    } else {
        parentState = resolveProfileStateJS(profiles, parentId, baseState);
    }
    
    const merged = JSON.parse(JSON.stringify(parentState));
    function deepMerge(target, source) {
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], deepMerge(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    }
    return deepMerge(merged, state);
}

function updateProgressBar() {
    const container = document.getElementById("multi-profile-progress-container");
    if (!container) return;
    
    async function renderAllProgress() {
        let url = "/api/form-state";
        if (currentUser.role === "consultor" && currentClientId) {
            url += "?client_id=" + currentClientId;
        }
        
        try {
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            const rawGlobalState = data.state || {};
            
            let html = "";
            
            function buildBarHTML(title, missing, total) {
                const pct = total > 0 ? Math.round(((total - missing) / total) * 100) : 100;
                let colorClass = "bg-apdata-gold";
                if (pct === 100) colorClass = "bg-success";
                
                return `
                    <div class="mb-4">
                        <div class="flex justify-between items-end text-sm font-semibold text-outline mb-1">
                            <span class="truncate pr-2" title="${title}">${title}</span>
                            <span class="${pct === 100 ? 'text-success' : 'text-apdata-gold'} font-bold">${pct}%</span>
                        </div>
                        <div class="w-full bg-surface-variant rounded-full h-2 overflow-hidden border border-outline-variant/30 mb-1.5">
                            <div class="${colorClass} h-2 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
                        </div>
                        <div class="text-xs text-on-surface-variant">
                            ${missing === 0 ? "Completado" : `Faltam ${missing} campos obrigatórios`}
                        </div>
                    </div>
                `;
            }
            
            let globMissing = 0;
            let globTotal = 0;
            formSchema.forEach(section => {
                const p = getSectionProgress(section, rawGlobalState);
                globMissing += p.missing;
                globTotal += p.total;
            });
            html += buildBarHTML("Global (Matriz)", globMissing, globTotal);
            
            clientProfiles.forEach(prof => {
                const mergedState = resolveProfileStateJS(clientProfiles, prof.id, rawGlobalState);
                let pMissing = 0;
                let pTotal = 0;
                formSchema.forEach(section => {
                    const p = getSectionProgress(section, mergedState);
                    pMissing += p.missing;
                    pTotal += p.total;
                });
                html += buildBarHTML(prof.name, pMissing, pTotal);
            });
            
            container.innerHTML = html;
        } catch(e) {}
    }
    
    renderAllProgress();

    const sections = getCategorySections();
    const section = sections[currentStepIndex];
    if (section) {
        const sidebarItem = document.querySelector(`#sections-menu-list .step-item[data-index="${currentStepIndex}"]`);
        if (sidebarItem) {
            const isCompleted = isSectionComplete(section);
            const iconContainer = sidebarItem.querySelector(".step-status-icon");
            if (iconContainer) {
                iconContainer.className = isCompleted ? "fa-solid fa-circle-check step-status-icon completed" : "fa-regular fa-circle step-status-icon pending";
            }
        }
    }
}




// Export Trigger

if (btnExportPayload) {
    btnExportPayload.addEventListener("click", () => {
        triggerExport();
    });
}



function triggerExport() {

    // Generate transaction layout matching standard ApIntegrationServer format

    const transactions = [];

    let integrationIdCounter = 10001;

    const helpRequired = [];

    

    Object.keys(formState).forEach(cat => {

        Object.keys(formState[cat]).forEach(sectionTitle => {

            const answers = formState[cat][sectionTitle];

            const items = [];

            

            function extractCsv(obj, prefix) {
                    Object.keys(obj).forEach(k => {
                        if (k.endsWith("_need_help")) return;
                        const val = obj[k];
                        if (val && typeof val === "object" && !Array.isArray(val) && val.data === undefined && val.size === undefined && val.name === undefined) {
                            let gName = "";
                            if (k === "_groupAnswers" || k === "Geral") {
                                gName = prefix;
                            } else {
                                let translatedName = k;
                                if (formState[cat] && Array.isArray(formState[cat]._companyGroups)) {
                                    const matched = formState[cat]._companyGroups.find(g => g.id === k);
                                    if (matched) translatedName = matched.name;
                                }
                                gName = prefix ? `${prefix} - ${translatedName}` : `${translatedName}`;
                            }
                            extractCsv(val, gName);
                        } else {
                            const finalName = prefix ? `${prefix} -> ${k}` : k;
                            const cleanVal = Array.isArray(val) ? `[Tabela com ${val.length} registros]` : String(val || '').replace(/;/g, ",");
                            const hasDoubt = obj[k + "_need_help"] === true ? "SIM" : "NÃO";
                            csv += `${cat};${sectionTitle};${finalName};${cleanVal};${hasDoubt}
`;
                        }
                    });
                }
                extractCsv(answers, "");

        });

    });

    csvOutput.textContent = csv;

    

    // Show Modal

    exportModal.classList.add("active");

}



// Close Modal

if (btnCloseModal) {
    btnCloseModal.addEventListener("click", () => {
        if (exportModal) exportModal.classList.remove("active");
    });
}



// Close when click outside

if (exportModal) {
    exportModal.addEventListener("click", (e) => {
        if (e.target === exportModal) {
            exportModal.classList.remove("active");
        }
    });
}



// Tabs in modal

document.querySelectorAll(".tab-link").forEach(tabLink => {

    tabLink.addEventListener("click", (e) => {

        const link = e.currentTarget;

        const parent = link.closest(".modal-container");

        parent.querySelectorAll(".tab-link").forEach(l => l.classList.remove("active"));

        parent.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

        

        link.classList.add("active");

        const targetTab = link.getAttribute("data-tab");

        document.getElementById(targetTab).classList.add("active");

    });

});



// Copy to Clipboard

if (btnCopyClipboard) {
    btnCopyClipboard.addEventListener("click", () => {
        const activeTab = document.querySelector(".tab-content.active code");
        navigator.clipboard.writeText(activeTab.textContent).then(() => {
            showAlertModal("Conteúdo copiado para a área de transferência!");
        }).catch(err => {
            console.error("Falha ao copiar:", err);
        });
    });
}



// Download JSON file

if (btnDownloadData) {
    btnDownloadData.addEventListener("click", () => {
        const activeTabLink = document.querySelector(".tab-link.active");
        const isJson = activeTabLink.getAttribute("data-tab") === "tab-json";
        
        const content = document.querySelector(".tab-content.active code").textContent;
        const blob = new Blob([content], { type: isJson ? "application/json" : "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = isJson ? "implantacao_ga_payload.json" : "implantacao_ga_resumo.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}



// ApScripter Configuration Modal UI elements
const btnConfigApScripter = document.getElementById("btn-config-apscripter");
const configModal = document.getElementById("config-modal");
const btnCloseConfigModal = document.getElementById("btn-close-config-modal");
const btnCancelConfig = document.getElementById("btn-cancel-config");
const btnSaveConfig = document.getElementById("btn-save-config");
const cfgIp = document.getElementById("cfg-ip");
const cfgPort = document.getElementById("cfg-port");
const cfgUser = document.getElementById("cfg-user");
const cfgPass = document.getElementById("cfg-pass");
const cfgGearType = document.getElementById("cfg-gear-type");

async function loadApScripterConfig(type) {
    let url = `/api/config?type=${type}`;
    if (typeof currentClientId !== "undefined" && currentClientId) {
        url += `&client_id=${encodeURIComponent(currentClientId)}`;
    }
    const res = await fetch(url);
    if (!res.ok) {
        console.error("Failed to load config", res.status);
        return;
    }
    const cfg = await res.json();
    cfgIp.value = cfg.ip || "";
    cfgPort.value = cfg.port || "";
    cfgUser.value = cfg.user || "";
    cfgPass.value = cfg.pass || "";
}

if (cfgGearType) {
    cfgGearType.addEventListener("change", (e) => {
        loadApScripterConfig(e.target.value);
    });
}

if (btnConfigApScripter) {
    btnConfigApScripter.addEventListener("click", async () => {
        const type = cfgGearType ? cfgGearType.value : "principal";
        await loadApScripterConfig(type);
        configModal.classList.remove("hidden");
        configModal.classList.add("flex");
    });
}

if (btnCloseConfigModal) {
    btnCloseConfigModal.addEventListener("click", () => {
        configModal.classList.add("hidden");
        configModal.classList.remove("flex");
    });
}

if (btnCancelConfig) {
    btnCancelConfig.addEventListener("click", () => {
        configModal.classList.add("hidden");
        configModal.classList.remove("flex");
    });
}

if (btnSaveConfig) {
    btnSaveConfig.addEventListener("click", async () => {
        const type = cfgGearType ? cfgGearType.value : "principal";
        
        const payload = {
            type: type,
            ip: cfgIp.value.trim(),
            port: cfgPort.value.trim(),
            user: cfgUser.value.trim(),
            pass: cfgPass.value.trim()
        };
        
        if (typeof currentClientId !== "undefined" && currentClientId) {
            payload.client_id = currentClientId;
        }
        
        const res = await fetch("/api/config", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            showAlertModal("Configuração do ApScripter salva com sucesso!");
            configModal.classList.add("hidden");
            configModal.classList.remove("flex");
        } else {
            const data = await res.json();
            showAlertModal(`Erro ao salvar: ${data.error || 'Acesso negado.'}`);
        }
    });
}



const clientModal = document.getElementById("client-modal");

const btnCloseClientModal = document.getElementById("btn-close-client-modal");

const newClientName = document.getElementById("new-client-name");

const newClientUser = document.getElementById("new-client-user");

const newClientPass = document.getElementById("new-client-pass");

const btnCancelClient = document.getElementById("btn-cancel-client");

const btnSaveClient = document.getElementById("btn-save-client");



if (btnCloseClientModal) {

    btnCloseClientModal.addEventListener("click", () => {

        clientModal.classList.add("hidden");

        clientModal.classList.remove("flex");

    });

}

if (btnCancelClient) {

    btnCancelClient.addEventListener("click", () => {

        clientModal.classList.add("hidden");

        clientModal.classList.remove("flex");

    });

}

if (btnSaveClient) {

    btnSaveClient.addEventListener("click", async () => {

        await fetch("/api/clients", {

            method: "POST",

            headers: {"Content-Type": "application/json"},

            body: JSON.stringify({

                action: "create",

                name: newClientName.value.trim(),

                user: newClientUser.value.trim(),

                pass: newClientPass.value.trim()

            })

        });

        showAlertModal("Cliente salvo com sucesso!");

        clientModal.classList.add("hidden");

        clientModal.classList.remove("flex");

        window.location.reload();

    });

}



const editClientModal = document.getElementById("edit-client-modal");

const btnCloseEditClientModal = document.getElementById("btn-close-edit-client-modal");

const editClientId = document.getElementById("edit-client-id");

const editClientName = document.getElementById("edit-client-name");

const editClientUser = document.getElementById("edit-client-user");

const editClientPass = document.getElementById("edit-client-pass");

const btnCancelEditClient = document.getElementById("btn-cancel-edit-client");

const btnSaveEditClient = document.getElementById("btn-save-edit-client");



if (btnCloseEditClientModal) {

    btnCloseEditClientModal.addEventListener("click", () => {

        editClientModal.classList.add("hidden");

        editClientModal.classList.remove("flex");

    });

}

if (btnCancelEditClient) {

    btnCancelEditClient.addEventListener("click", () => {

        editClientModal.classList.add("hidden");

        editClientModal.classList.remove("flex");

    });

}

if (btnSaveEditClient) {

    btnSaveEditClient.addEventListener("click", async () => {

        await fetch("/api/clients", {

            method: "POST",

            headers: {"Content-Type": "application/json"},

            body: JSON.stringify({

                action: "edit",

                id: editClientId.value,

                name: editClientName.value.trim(),

                user: editClientUser.value.trim(),

                pass: editClientPass.value.trim()

            })

        });

        showAlertModal("Cliente editado com sucesso!");

        editClientModal.classList.add("hidden");

        editClientModal.classList.remove("flex");

        window.location.reload();

    });

}



// ApScripter WebSockets and Logic

const btnRun = document.getElementById("btn-export-payload");

if (btnRun) {

    btnRun.addEventListener("click", async () => {

        btnRun.disabled = true;

        btnRun.classList.add("opacity-50", "cursor-not-allowed");

        

        const logModal = document.createElement("div");

        logModal.className = "fixed inset-0 bg-[#000000aa] backdrop-blur-sm z-[200] flex items-center justify-center p-4";

        logModal.innerHTML = `

            <div class="bg-surface-container-low rounded-3xl p-6 w-full max-w-3xl border border-outline-variant/30 flex flex-col gap-4 max-h-[90vh]">

                <div class="flex items-center justify-between">

                    <h3 class="text-title-large font-bold text-on-surface">Execução ApScripter</h3>

                    <button class="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors" id="btn-close-log">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

                <div class="flex-1 overflow-auto bg-[#1e1e1e] rounded-xl p-4 font-mono text-sm text-[#d4d4d4]" id="log-output">

                    Iniciando exportação...<br>

                </div>

            </div>

        `;

        document.body.appendChild(logModal);

        

        const logEl = logModal.querySelector("#log-output");

        logModal.querySelector("#btn-close-log").addEventListener("click", () => {

            logModal.remove();

        });



        const wsUrl = `ws://${window.location.host}/ws/run`;

        const ws = new WebSocket(wsUrl);

        ws.onmessage = (e) => {

            logEl.innerHTML += e.data + "<br>";

            logEl.scrollTop = logEl.scrollHeight;

        };

        ws.onerror = (e) => {

            logEl.innerHTML += "<span class='text-error'>Erro na conexão websocket.</span><br>";

        };

        ws.onclose = () => {

            logEl.innerHTML += "<span class='text-emerald-500'>Conexão finalizada.</span><br>";

            btnRun.disabled = false;

            btnRun.classList.remove("opacity-50", "cursor-not-allowed");



            btnRun.classList.replace("bg-primary", "bg-error");



        }



        logEl.scrollTop = logEl.scrollHeight;



    });



}



    async function fetchReportData(iaType) {







        try {







            const resultsPanel = document.getElementById("ia-results-panel");

            let url = `/api/report-ia?type=${iaType}&category=${encodeURIComponent(currentCategory)}`;







            if (currentUser && currentUser.role === "consultor" && typeof currentClientId !== 'undefined' && currentClientId) {







                url += `&client_id=${currentClientId}`;







            }







            const res = await fetch(url);







            const data = await res.json();







            if (data.success) {







                if (data.type === "empresas") {







                    resultsPanel.classList.remove("hidden");







                    if (data.extraction_html) {







                        resultsPanel.innerHTML = data.extraction_html;







                    }







                    if (data.ai_summary) {







                        if (window.addChatMessage) window.addChatMessage("system", data.ai_summary);







                    }







                } else {







                    resultsPanel.classList.remove("hidden");







                    resultsPanel.innerHTML = `







                        <div class="grid grid-cols-3 gap-4">







                            <div class="bg-white p-4 rounded-xl border border-outline-variant/30 text-center shadow-sm">







                                <span class="block text-[11px] text-outline font-bold uppercase mb-1">Base GA</span>







                                <span class="text-headline-sm font-bold text-primary" id="ia-stat-total">${data.stats ? data.stats.total : 0}</span>







                            </div>







                            <div class="bg-white p-4 rounded-xl border border-outline-variant/30 text-center shadow-sm">







                                <span class="block text-[11px] text-outline font-bold uppercase mb-1">Sem CNPJ (Erros)</span>







                                <span class="text-headline-sm font-bold text-error" id="ia-stat-nocnpj">${data.stats ? (data.stats.sem_cnpj || 0) : 0}</span>







                            </div>







                            <div class="bg-white p-4 rounded-xl border border-outline-variant/30 text-center shadow-sm">







                                <span class="block text-[11px] text-outline font-bold uppercase mb-1">% Sem CNPJ</span>







                                <span class="text-headline-sm font-bold text-apdata-gold" id="ia-stat-pct">${data.stats ? ((data.stats.porcentagem_erro || 0) + "%") : "0%"}</span>







                            </div>







                        </div>







                        <div class="bg-surface-container/30 p-4 rounded-xl border border-outline-variant/50 mt-6">







                            <h4 class="font-bold text-sm text-on-surface mb-2">Amostra de Entidades sem CNPJ</h4>







                            <ul id="ia-missing-list" class="list-disc pl-5 text-sm text-on-surface-variant space-y-1"></ul>







                        </div>







                    `;







                    







                    const ul = document.getElementById("ia-missing-list");







                    ul.innerHTML = "";







                    if (data.no_cnpj_sample && data.no_cnpj_sample.length > 0) {







                        data.no_cnpj_sample.forEach(name => {







                            ul.innerHTML += `<li>${name}</li>`;







                        });







                    } else {







                        ul.innerHTML = "<li class='text-emerald-600 font-semibold'>Nenhuma entidade sem CNPJ/Documento!</li>";







                    }







                }







            }







        } catch(e) { console.error("Error fetching report", e); }







    }















    const chatInput = document.getElementById("ia-chat-input");







    const btnSend = document.getElementById("btn-send-chat");







    const chatContainer = document.getElementById("ia-chat-messages");















    window.addChatMessage = function(role, text) {







        const chatContainer = document.getElementById("ia-chat-messages");

        if (!chatContainer) return;

        const div = document.createElement("div");







        div.className = role === "user" ? "flex items-start gap-3 w-10/12 self-end flex-row-reverse" : "flex items-start gap-3 w-10/12";







        







        let icon = role === "user" ? `<span class="material-symbols-outlined text-on-surface-variant text-[16px]">person</span>` : `<span class="material-symbols-outlined text-on-primary text-[16px]">robot_2</span>`;







        let iconBg = role === "user" ? "bg-surface-container" : "bg-primary";







        let bubbleStyle = role === "user" ? "bg-primary-container text-on-primary-container rounded-tr-none" : "bg-white text-on-surface border border-outline-variant/20 rounded-tl-none";















        div.innerHTML = `







            <div class="w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0 shadow-sm">







                ${icon}







            </div>







            <div class="p-3 rounded-2xl shadow-sm text-sm ${bubbleStyle}">







                ${text}







            </div>







        `;







        chatContainer.appendChild(div);







        chatContainer.scrollTop = chatContainer.scrollHeight;







    }















    window.sendChatMessage = async function() {







        const msg = chatInput.value.trim();







        if(!msg) return;







        







        addChatMessage("user", msg);







        if (chatInput) chatInput.value = "";







        if (chatInput) chatInput.disabled = true;







        let btnSend_el = document.getElementById("btn-send-chat");

        if (btnSend_el) btnSend_el.disabled = true;







        







        try {







            const typeIA = document.getElementById("ia-modal-backdrop").getAttribute("data-iatype");







            const res = await fetch(`/api/chat-ia?type=${typeIA}`, {







                method: "POST",







                headers: {"Content-Type": "application/json"},







                body: JSON.stringify({message: msg})







            });







            const data = await res.json();







            







            if (data.response_html) {







                addChatMessage("system", data.response_html);







            } else {







                addChatMessage("system", "Desculpe, nÃÂ¯Ã‚Â¿Ã‚Â½o consegui processar isso.");







            }







        } catch(e) {







            addChatMessage("system", "Erro de conexÃÂ¯Ã‚Â¿Ã‚Â½o com o Assistente.");







        }







        







        if (chatInput) chatInput.disabled = false;







        btnSend_el = document.getElementById("btn-send-chat");

        if (btnSend_el) btnSend_el.disabled = false;







        if (chatInput) chatInput.focus();







    }















// Initial startup







loadSchema();















// AI Auto-Fill Function



window.fillCompanyFromIA = function(companyName, cnpj = "") {

    const cat = currentCategory;

    const secTitle = "Dados da Empresa";

    

    if (!formState[cat]) formState[cat] = {};

    if (!formState[cat][secTitle]) formState[cat][secTitle] = {};

    

    // Find the grid key dynamically from the schema

    let gridKey = null;

    const secs = formSchema.filter(s => s.type === cat);

    for (const sec of secs) {

        if (sec.title === secTitle && sec.fields) {

            for (const field of sec.fields) {

                if (field.type === "grid" || field.type === "table") {

                    gridKey = field.label || field.key;

                    break;

                }

            }

        }

    }

    

    // Fallback: search existing array keys in state

    if (!gridKey) {

        const state = formState[cat][secTitle];

        for (const key of Object.keys(state)) {

            if (Array.isArray(state[key])) {

                gridKey = key;

                break;

            }

        }

    }

    

    if (!gridKey) {

        gridKey = Object.keys(formState[cat][secTitle]).find(k => k.includes("Social")) || "Empresas";

    }

    

    if (!formState[cat][secTitle][gridKey]) {

        formState[cat][secTitle][gridKey] = [];

    }

    

    // Check duplicates

    const exists = formState[cat][secTitle][gridKey].find(row => {

        return Object.values(row).some(v => typeof v === "string" && v.trim().toLowerCase() === companyName.trim().toLowerCase());

    });

    

    if (exists) {

        showAlertModal("Esta empresa já está preenchida na tabela!");

        return;

    }

    

    // Build row dynamically from schema columns

    const newRow = { "_ai_filled": true };

    for (const sec of secs) {

        if (sec.title === secTitle && sec.fields) {

            for (const field of sec.fields) {

                if ((field.type === "grid" || field.type === "table") && (field.label === gridKey || field.key === gridKey)) {

                    if (field.columns) {

                        field.columns.forEach((col, i) => {

                            const colName = typeof col === "string" ? col : col.label || col.key || "Col" + i;

                            if (colName.toLowerCase().includes("razao") || colName.toLowerCase().includes("razão")) {

                                newRow[colName] = companyName;

                            } else if (colName.toLowerCase().includes("cnpj")) {

                                newRow[colName] = cnpj;

                            } else {

                                newRow[colName] = "";

                            }

                        });

                    }

                    break;

                }

            }

        }

    }

    

    // Fallback if no columns found from schema

    if (Object.keys(newRow).length <= 1) {

        newRow["Razão Social"] = companyName;

        newRow["CNPJ"] = cnpj;

        newRow["Endereço Completo"] = "";

        newRow["Responsável pelo RH:  Nome, Telefone e E-mail"] = "";

    }

    

    formState[cat][secTitle][gridKey].push(newRow);

    saveDraft();

    

    // Refresh the current view (this will re-render the form and clear the AI panel)

    updateStepView();

    

    // Auto-retrigger the AI extraction so the user doesn't lose the panel and sees progress update

    setTimeout(() => {

        const btnExt = document.getElementById("btn-extract-empresas");

        if (btnExt) {

            btnExt.click();

        }

    }, 100);

};



window.filterContratadosTable = function() {

    let input = document.getElementById('filterContratados');

    if (!input) return;

    let filter = input.value.toLowerCase();

    let tbody = document.getElementById('contratadosTbody');

    if (!tbody) return;

    let tr = tbody.getElementsByTagName('tr');

    let total = 0;

    

    for (let i = 0; i < tr.length; i++) {

        if (tr[i].id === 'noResultsRow') continue;

        let text = tr[i].innerText.toLowerCase();

        if (text.indexOf(filter) > -1) {

            tr[i].style.display = '';

            let qty = parseInt(tr[i].getAttribute('data-qty') || 0);

            total += qty;

        } else {

            tr[i].style.display = 'none';

        }

    }

    

    let filteredContainer = document.getElementById('filteredTotalContainer');

    if (filteredContainer) {

        if (filter.trim() === '') {

            filteredContainer.classList.add('hidden');

            filteredContainer.classList.remove('flex');

        } else {

            filteredContainer.classList.remove('hidden');

            filteredContainer.classList.add('flex');

            document.getElementById('contratadosTotalFiltered').innerText = total;

        }

    }

};





// ==========================================

// FORM EDITOR LOGIC

// ==========================================

const btnToggleEditMode = document.getElementById("btn-toggle-edit-mode");

if (btnToggleEditMode) {

    btnToggleEditMode.addEventListener("click", () => {

        isEditMode = !isEditMode;

        if (isEditMode) {

            btnToggleEditMode.classList.remove("bg-tertiary", "text-on-tertiary");

            btnToggleEditMode.classList.add("bg-error", "text-on-error");

            btnToggleEditMode.innerHTML = '<i class="fa-solid fa-xmark"></i> Sair da Edição';

        } else {

            btnToggleEditMode.classList.add("bg-tertiary", "text-on-tertiary");

            btnToggleEditMode.classList.remove("bg-error", "text-on-error");

            btnToggleEditMode.innerHTML = '<i class="fa-solid fa-pencil-ruler"></i> Modo Edição';

        }

        initWizard();

        updateStepView();
        updateClientOverlay();

    });

}



async function saveSchemaToServer() {
    try {
        let url = '/api/schema';
        if (currentClientId) {
            url += '?client_id=' + encodeURIComponent(currentClientId);
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formSchema)
        });
        const result = await response.json();
        if (result.success) {
            console.log("Schema salvo com sucesso!");
            await reloadSchemaForCurrentContext();
        } else {
            showAlertModal("Erro ao salvar schema: " + (result.error || "Erro desconhecido"));
        }
    } catch (e) {
        console.error(e);
        showAlertModal("Erro de comunicação ao salvar schema.");
    }
}

async function reloadSchemaForCurrentContext() {
    try {
        let res = await fetch('./form_schema.json?v=' + Date.now());
        if (!res.ok) {
            res = await fetch('form_schema.json?v=' + Date.now());
        }
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                formSchema = data;
                console.log("[Portal GAIA] form_schema.json carregado com sucesso. Total topicos:", formSchema.length);
            }
        } else {
            console.error("[Portal GAIA] Falha HTTP ao buscar form_schema.json:", res.status);
        }
    } catch (e) {
        console.error("[Portal GAIA] Erro na requisicao do schema:", e);
    }
    initWizard();
    updateStepView();
}



// Topic Editor

const topicModal = document.getElementById("topic-modal");

const btnCloseTopic = document.querySelectorAll(".btn-close-topic");

btnCloseTopic.forEach(btn => btn.addEventListener("click", () => {

    const tM = document.getElementById("topic-modal") || topicModal;

    if (tM) tM.style.cssText = "display: none !important;";

}));



function openTopicEditor(index, section) {

    document.getElementById("topic-edit-index").value = index;

    if (index >= 0 && section) {

        document.getElementById("topic-modal-title").innerText = "Editar Tópico";

        document.getElementById("topic-name").value = section.title;

        document.getElementById("topic-category").value = section.type;

    } else {

        document.getElementById("topic-modal-title").innerText = "Novo Tópico";

        document.getElementById("topic-name").value = "";

        document.getElementById("topic-category").value = currentCategory;

    }

    const tM = document.getElementById("topic-modal") || topicModal;
    if (tM) {
        document.body.appendChild(tM);
        tM.classList.remove("hidden");
        tM.style.cssText = "display: flex !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important; z-index: 2147483647 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.8) !important;";
        const content = document.getElementById("topic-modal-content") || tM.querySelector("div");
        if (content) {
            content.style.cssText = "display: flex !important; visibility: visible !important; opacity: 1 !important; transform: scale(1) !important; background: white !important; position: relative !important; z-index: 2147483647 !important; width: 100% !important; max-width: 32rem !important; flex-direction: column !important;";
        }
    }

}



document.getElementById("btn-save-topic").addEventListener("click", async () => {

    const idx = parseInt(document.getElementById("topic-edit-index").value);

    const title = document.getElementById("topic-name").value;

    const cat = document.getElementById("topic-category").value;

    

    if (!title) return;

    

    if (idx >= 0) {

        // Find actual index in global formSchema

        const sections = getCategorySections();

        const section = sections[idx];

        if (section) section.title = title;

    } else {

        formSchema.push({

            title: title,

            type: cat,

            content: []

        });

    }

    

    const tM = document.getElementById("topic-modal") || topicModal;
    if (tM) tM.style.cssText = "display: none !important;";

    await saveSchemaToServer();

});



// Question Editor

const questionModal = document.getElementById("question-modal");

const btnCloseQuestion = document.querySelectorAll(".btn-close-question");

btnCloseQuestion.forEach(btn => btn.addEventListener("click", () => {

    const qM = document.getElementById("question-modal") || questionModal;

    if (qM) qM.style.cssText = "display: none !important;";

}));



function renderQuestionOptions(options = []) {

    const list = document.getElementById("q-options-list");

    list.innerHTML = "";

    options.forEach((opt, idx) => {

        const div = document.createElement("div");

        div.className = "flex items-center gap-2 bg-surface p-2 border border-outline-variant rounded";

        div.innerHTML = `

            <input type="text" class="flex-1 text-sm bg-transparent outline-none option-label" value="${opt.label}" placeholder="Texto da Opção">

            <label class="flex items-center gap-1 text-xs cursor-pointer ml-4">

                <input type="checkbox" class="option-has-text" ${opt.hasTextInput ? 'checked' : ''}> Add campo texto (Ex: Qual?)

            </label>

            <button type="button" class="text-error hover:bg-error/10 p-1 rounded ml-2" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>

        `;

        list.appendChild(div);

    });

}



document.getElementById("btn-add-q-option").addEventListener("click", () => {

    const list = document.getElementById("q-options-list");

    const div = document.createElement("div");

    div.className = "flex items-center gap-2 bg-surface p-2 border border-outline-variant rounded";

    div.innerHTML = `

        <input type="text" class="flex-1 text-sm bg-transparent outline-none option-label" value="" placeholder="Texto da Opção">

        <label class="flex items-center gap-1 text-xs cursor-pointer ml-4">

            <input type="checkbox" class="option-has-text"> Add campo texto (Ex: Qual?)

        </label>

        <button type="button" class="text-error hover:bg-error/10 p-1 rounded ml-2" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>

    `;

    list.appendChild(div);

});



document.querySelectorAll('input[name="q-type"]').forEach(radio => {

    radio.addEventListener("change", (e) => {

        if (e.target.value === "checkbox" || e.target.value === "dropdown") {

            document.getElementById("q-options-container").classList.remove("hidden");
            const trg = document.getElementById("q-trigger-container");
            if(trg) { if(e.target.value==="dropdown") trg.classList.remove("hidden"); else trg.classList.add("hidden"); }


        } else {

            document.getElementById("q-options-container").classList.add("hidden");
        const trg = document.getElementById("q-trigger-container");
        if(trg) trg.classList.add("hidden");
        const tw = document.getElementById("q-trigger-words");
        if(tw) tw.value = "";
        const reqChk = document.getElementById("q-required");
        if (reqChk) reqChk.checked = false;

        }

    });

});



function openQuestionEditor(itemIndex, element) {
    const section = getCategorySections()[currentStepIndex];
    if (!section) { console.warn("openQuestionEditor: no section"); return; }

    let absSectionIdx = formSchema.findIndex(s => s === section);
    if (absSectionIdx === -1) {
        absSectionIdx = formSchema.findIndex(s => s.type === currentCategory && s.title === section.title);
    }
    if (absSectionIdx === -1) absSectionIdx = 0;

    // Always work with real schema item, not a copy
    const realItem = (itemIndex >= 0 && section.content && section.content[itemIndex])
        ? section.content[itemIndex]
        : (element || null);

    document.getElementById("q-topic-index").value = absSectionIdx;
    document.getElementById("q-item-index").value = itemIndex;

    if (itemIndex >= 0 && realItem) {
        document.getElementById("question-modal-title").innerText = "Editar Pergunta";
        document.getElementById("q-text").value = realItem.text || realItem.titleText || "";

        let type = "text";
        let options = [];
        const elType = realItem.element || "question_structured";

        if (elType === "question_structured") {
            type = realItem.responseType || "text";
            options = realItem.options || [];
        } else if (elType === "checkbox_group") {
            type = "checkbox";
        } else if (elType === "paragraph") {
            const txt = (realItem.text || "").trim();
            type = (txt.includes("Orientações") || txt.includes("Importante") || txt.includes("Atenção")) ? "note" : "text";
        }

        if (type !== "checkbox" && type !== "dropdown" && type !== "note" && type !== "attachment") type = "text";

        const radioEl = document.querySelector('input[name="q-type"][value="' + type + '"]');
        if (radioEl) radioEl.checked = true;
        else { const def = document.querySelector('input[name="q-type"][value="text"]'); if (def) def.checked = true; }

        const reqChk = document.getElementById("q-required");
        if (reqChk) reqChk.checked = Boolean(realItem && realItem.isRequired);

        if (type === "checkbox" || type === "dropdown") {
            document.getElementById("q-options-container").classList.remove("hidden");
            renderQuestionOptions(options);
            const trg = document.getElementById("q-trigger-container");
            if (trg) {
                if (type === "dropdown") {
                    trg.classList.remove("hidden");
                    const tw = document.getElementById("q-trigger-words");
                    if(tw) tw.value = (realItem.triggerInputOn || []).join(", ");
                } else {
                    trg.classList.add("hidden");
                }
            }
        } else {
            document.getElementById("q-options-container").classList.add("hidden");
        }
    } else {
        document.getElementById("question-modal-title").innerText = "Nova Pergunta";
        document.getElementById("q-text").value = "";
        const def = document.querySelector('input[name="q-type"][value="text"]');
        if (def) def.checked = true;
        document.getElementById("q-options-container").classList.add("hidden");
        const reqChk = document.getElementById("q-required");
        if (reqChk) reqChk.checked = false;
        renderQuestionOptions([]);
    }
    
    const qModal = document.getElementById("question-modal");
    if(qModal) {
        // Mover para o final do body para evitar problemas de z-index ou container
        document.body.appendChild(qModal);
        
        qModal.classList.remove("hidden");
        qModal.style.cssText = "display: flex !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important; z-index: 2147483647 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.8) !important;";
        
        const content = document.getElementById("question-modal-content");
        if(content) {
            content.style.cssText = "display: flex !important; visibility: visible !important; opacity: 1 !important; transform: scale(1) !important; background: white !important; position: relative !important; z-index: 2147483647 !important; width: 100% !important; max-width: 42rem !important; max-height: 90vh !important; overflow: hidden !important; flex-direction: column !important;";
        }
    }
}




document.getElementById("btn-save-question").addEventListener("click", async function() {
    let topicIdx = parseInt(document.getElementById("q-topic-index").value);
    const itemIdx = parseInt(document.getElementById("q-item-index").value);
    const text = (document.getElementById("q-text").value || "").trim();
    const selectedRadio = document.querySelector('input[name="q-type"]:checked');
    const type = selectedRadio ? selectedRadio.value : "text";

    if (!text) {
        showAlertModal("Por favor, preencha o enunciado da pergunta.");
        return;
    }

    if (isNaN(topicIdx) || topicIdx < 0 || topicIdx >= formSchema.length) {
        const curSec = getCategorySections()[currentStepIndex];
        topicIdx = formSchema.findIndex(s => s === curSec || (s.type === currentCategory && s.title === curSec.title));
    }

    if (topicIdx < 0 || !formSchema[topicIdx]) {
        showAlertModal("Erro: Seção de destino não encontrada.");
        return;
    }

    const section = formSchema[topicIdx];
    if (!section.content) section.content = [];

    
      let opts = [];
      let triggerArr = [];
      if (type === "checkbox" || type === "dropdown") {
          const triggerVal = document.getElementById("q-trigger-words") ? document.getElementById("q-trigger-words").value : "";
          if (triggerVal) {
              triggerVal.split(",").forEach(v => { if(v.trim()) triggerArr.push(v.trim()) });
          }
          document.querySelectorAll("#q-options-list > div").forEach(function(div) {
              const labelEl = div.querySelector(".option-label");
              const hasTextEl = div.querySelector(".option-has-text");
              if (labelEl && labelEl.value) {
                  opts.push({ label: labelEl.value, hasTextInput: hasTextEl ? hasTextEl.checked : false });
              }
          });
      }
      
      if (itemIdx >= 0 && itemIdx < section.content.length) {
          const existing = section.content[itemIdx];
          if (existing.element === "paragraph") {
              existing.text = text;
          } else {
              existing.text = text;
              existing.responseType = type;
              existing.isRequired = Boolean(document.getElementById("q-required") && document.getElementById("q-required").checked);
              if (type === "checkbox" || type === "dropdown") {
                  existing.options = opts;
                  if (triggerArr.length > 0) existing.triggerInputOn = triggerArr;
                  else delete existing.triggerInputOn;
              }
          }
      } else {
          const reqVal = Boolean(document.getElementById("q-required") && document.getElementById("q-required").checked);
          const newEl = { compositeColumns: typeof currentCompositeCols !== "undefined" ? JSON.parse(JSON.stringify(window.currentCompositeCols)) : [], element: "question_structured", text: text, responseType: type, isRequired: reqVal };
          if (type === "checkbox" || type === "dropdown") {
              newEl.options = opts;
              if (triggerArr.length > 0) newEl.triggerInputOn = triggerArr;
              newEl.inputPlaceholder = "Especifique";
          }
          section.content.push(newEl);
      }

      const qModal = document.getElementById("question-modal");
      if (qModal) {
          qModal.style.display = "none";
          qModal.style.cssText = "display: none !important;";
      }
      
      await saveSchemaToServer();
});



// Update inject explicit question rendering

const explicit_question_render = `

    } else if (item.element === "question_structured") {

        const questionContainer = document.createElement("div");

        questionContainer.className = "form-section relative group";

        questionContainer.style.padding = "24px";

        questionContainer.style.marginBottom = "16px";

        

        const cleanText = item.text;

        const isFilled = sectionState[cleanText] !== undefined && sectionState[cleanText] !== "";

        appendCardHeader(questionContainer, cleanText, cleanText, sectionState, isFilled);

            if (item.responseType === "composite_table") {
                renderCompositeTable(questionContainer, item, sectionState, cleanText);
            }


            if (item.isRequired) {
                questionContainer.style.cssText = "padding: 24px; margin-bottom: 16px; border: 2px solid #ef4444 !important; background-color: rgba(254, 242, 242, 0.7) !important; border-radius: 16px !important; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.15) !important;";
                const reqBanner = document.createElement("div");
                reqBanner.className = "mt-2 mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-extrabold shadow-sm";
                reqBanner.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-600 text-sm"></i> <span>Atenção: Obrigatório o preenchimento</span>';
                const headerFlex = questionContainer.querySelector(".card-header-flex");
                if (headerFlex) {
                    headerFlex.appendChild(reqBanner);
                } else {
                    questionContainer.insertBefore(reqBanner, questionContainer.firstChild);
                }
            }

            
            

        

        // Editor Actions

        if (isEditMode) {

            const editBtn = document.createElement("button");
            editBtn.type = "button";

            editBtn.className = "absolute top-4 right-4 bg-surface text-on-surface-variant hover:text-primary px-3 py-1 border border-outline-variant/30 rounded-lg shadow-sm text-xs font-bold transition-all z-[100]";

            editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Editar';

            editBtn.onclick = () => openQuestionEditor(item.originalIndex, item);

            questionContainer.appendChild(editBtn);

        }



        if (item.responseType === "note") {

            const noteBox = document.createElement("div");

            noteBox.className = "intro-card";

            noteBox.innerHTML = \`<i class="fa-solid fa-circle-info"></i><div class="intro-card-content"><p>\${cleanText}</p></div>\`;

            questionContainer.innerHTML = '';

            if (isEditMode) {

                const editBtn = document.createElement("button");
                editBtn.type = "button";

                editBtn.className = "absolute top-4 right-4 bg-surface text-on-surface-variant hover:text-primary px-3 py-1 border border-outline-variant/30 rounded-lg shadow-sm text-xs font-bold transition-all z-[100]";

                editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Editar';

                editBtn.onclick = () => openQuestionEditor(item.originalIndex, item);

                noteBox.appendChild(editBtn);

            }

            questionContainer.appendChild(noteBox);

        } else if (item.responseType === "text") {

            const isLongAnswer = true; // all text fields multiline

            if (isLongAnswer) {

                const textarea = document.createElement("textarea");

                textarea.className = "form-input mt-4";

                textarea.style.width = "100%";

                textarea.style.minHeight = "80px";

                textarea.placeholder = "Escreva sua resposta aqui...";

                textarea.value = sectionState[cleanText] || "";
if(item.responseType === "composite_table") { textarea.style.display = "none"; textarea.style.opacity = 0; }

                textarea.style.overflow = "hidden";

                textarea.style.resize = "none";

                setTimeout(() => { textarea.style.height = "auto"; textarea.style.height = textarea.scrollHeight + "px"; }, 10);

                textarea.addEventListener("input", (e) => {

                    e.target.style.height = "auto";

                    e.target.style.height = e.target.scrollHeight + "px";

                    sectionState[cleanText] = e.target.value;

                    saveDraft();

                });

                questionContainer.appendChild(textarea);

            } else {

                const input = document.createElement("input");

                input.type = "text";

                input.className = "form-input mt-4";

                input.style.width = "100%";

                input.placeholder = "Escreva sua resposta aqui...";

                input.value = sectionState[cleanText] || "";
if(item.responseType === "composite_table") { input.style.display = "none"; input.style.opacity = 0; }

                input.addEventListener("input", (e) => {

                    sectionState[cleanText] = e.target.value;

                    saveDraft();

                });

                questionContainer.appendChild(input);

            }

            


            


        } else if (item.responseType === "dropdown") {
            const dropDiv = document.createElement("div");
            dropDiv.className = "mt-3 flex flex-col gap-2";
            dropDiv.innerHTML = '<select class="w-full md:w-2/3 bg-surface border border-outline-variant rounded-lg px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:bg-surface-variant" disabled><option>Selecione...</option></select>';
            if (typeof questionContent !== "undefined") { questionContent.appendChild(dropDiv); } else { questionContainer.appendChild(dropDiv); }
        } else if (item.responseType === "checkbox") {

            const grid = document.createElement("div");

            grid.className = "form-grid mt-4";

            

            item.options.forEach((opt, oIdx) => {

                const optionId = \`explicit_opt_\${idx}_\${oIdx}\`;

                const isChecked = sectionState[opt.label] === true;

                

                const optionCard = document.createElement("div");

                optionCard.className = \`option-card \${isChecked ? 'selected' : ''}\`;

                optionCard.style.padding = "8px 12px";

                

                const checkbox = document.createElement("input");

                checkbox.type = "checkbox";

                checkbox.id = optionId;

                checkbox.checked = isChecked;

                

                checkbox.addEventListener("change", () => {

                    sectionState[opt.label] = checkbox.checked;

                    saveDraft();

                    optionCard.classList.toggle("selected", checkbox.checked);

                    if (opt.hasTextInput) {

                        const input = optionCard.querySelector('input[type="text"]');

                        if (input) input.disabled = !checkbox.checked;

                    }

                });

                

                const optLabel = document.createElement("label");

                optLabel.setAttribute("for", optionId);

                optLabel.textContent = opt.label;

                optLabel.style.fontSize = "13px";

                

                optionCard.appendChild(checkbox);

                optionCard.appendChild(optLabel);

                

                if (opt.hasTextInput) {

                    const suffixInput = document.createElement("textarea");
suffixInput.style.overflow = "hidden";
suffixInput.style.resize = "none";
suffixInput.style.minHeight = "42px";
setTimeout(() => { suffixInput.style.height = "auto"; suffixInput.style.height = suffixInput.scrollHeight + "px"; }, 10);


                    suffixInput.style.marginLeft = "10px";

                    suffixInput.style.padding = "4px 8px";

                    suffixInput.style.border = "1px solid var(--border-color)";

                    suffixInput.style.borderRadius = "4px";

                    suffixInput.placeholder = "Especificar...";

                    suffixInput.value = sectionState[opt.label + "_detalhe"] || "";

                    suffixInput.addEventListener("input", (e) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";

                        sectionState[opt.label + "_detalhe"] = e.target.value;

                        saveDraft();

                    });

                    suffixInput.disabled = !isChecked;

                    optionCard.appendChild(suffixInput);

                }

                grid.appendChild(optionCard);

            });

            questionContainer.appendChild(grid);

        }

        

        targetContainer.appendChild(questionContainer);

`;



// Custom Confirm Modal Logic

let confirmActionCallback = null;



function showConfirmModal(message, callback, confirmBtnText = "Confirmar") {

    const modal = document.getElementById("confirm-modal");

    const msgEl = document.getElementById("confirm-modal-message");
    if (msgEl) msgEl.textContent = message;

    const btnConfirm = document.getElementById("btn-confirm-action");
    if (btnConfirm) {
        btnConfirm.textContent = confirmBtnText;
        if (confirmBtnText.toLowerCase().includes("finalizar")) {
            btnConfirm.className = "bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all";
        } else if (confirmBtnText.toLowerCase().includes("excluir") || confirmBtnText.toLowerCase().includes("deletar")) {
            btnConfirm.className = "bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all";
        } else {
            btnConfirm.className = "bg-[#1d1d1f] hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all";
        }
    }

    confirmActionCallback = callback;

    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove("hidden");
        modal.style.cssText = "display: flex !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important; z-index: 2147483647 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.8) !important;";
        const content = modal.querySelector(".bg-surface-container-lowest") || modal.querySelector("div");
        if (content) {
            content.style.cssText = "display: flex !important; visibility: visible !important; opacity: 1 !important; transform: scale(1) !important; background: white !important; position: relative !important; z-index: 2147483647 !important; width: 100% !important; max-width: 32rem !important; flex-direction: column !important;";
        }
    }

}



function hideConfirmModal() {

    const modal = document.getElementById("confirm-modal");

    if(modal) modal.style.cssText = "display: none !important;";

    confirmActionCallback = null;

}



document.querySelectorAll(".btn-close-confirm").forEach(btn => {

    btn.addEventListener("click", hideConfirmModal);

});



document.getElementById("btn-confirm-action").addEventListener("click", () => {

    if (confirmActionCallback) {

        confirmActionCallback();

    }

    hideConfirmModal();

});



// Custom Alert Modal Logic

function showAlertModal(message) {

    const modal = document.getElementById("alert-modal");

    document.getElementById("alert-modal-message").textContent = message;

    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove("hidden");
        modal.style.cssText = "display: flex !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important; z-index: 2147483647 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.8) !important;";
        const content = modal.querySelector(".bg-surface-container-lowest") || modal.querySelector("div");
        if (content) {
            content.style.cssText = "display: flex !important; visibility: visible !important; opacity: 1 !important; transform: scale(1) !important; background: white !important; position: relative !important; z-index: 2147483647 !important; width: 100% !important; max-width: 32rem !important; flex-direction: column !important;";
        }
    }

}



function hideAlertModal() {

    const modal = document.getElementById("alert-modal");

    if(modal) modal.style.cssText = "display: none !important;";

}



document.querySelectorAll(".btn-close-alert").forEach(btn => {

    btn.addEventListener("click", hideAlertModal);

});





const btnDeleteClient = document.getElementById("btn-delete-client");

if (btnDeleteClient) {

    btnDeleteClient.addEventListener("click", () => {

        const id = editClientId.value;

        if (!id) return;

        

        showConfirmModal("Tem certeza que deseja excluir este cliente permanentemente? Todo o progresso será perdido.", async () => {

            try {

                const res = await fetch("/api/clients", {

                    method: "POST",

                    headers: {"Content-Type": "application/json"},

                    body: JSON.stringify({ action: "delete", id: id })

                });

                

                if (res.ok) {

                    showAlertModal("Cliente excluído com sucesso!");

                    editClientModal.classList.add("hidden");

                    editClientModal.classList.remove("flex");

                    window.location.reload();

                } else {

                    showAlertModal("Erro ao excluir cliente.");

                }

            } catch(e) { console.error(e); }
        });
    });
}

function updateClientOverlay() {
    const overlay = document.getElementById("client-select-overlay");
    if (overlay) {
        if (currentUser && currentUser.role === "consultor" && !currentClientId && !isEditMode) {
            overlay.classList.remove("hidden");
            overlay.classList.add("flex");
        } else {
            overlay.classList.add("hidden");
            overlay.classList.remove("flex");
        }
    }
    if (typeof updateDicionario1215Visibility === "function") {
        updateDicionario1215Visibility();
    }
}





const legacyModal = document.getElementById("legacy-edit-modal");

const btnCloseLegacy = document.querySelector(".btn-close-legacy");

const btnSaveLegacy = document.getElementById("btn-save-legacy");

let currentLegacyIndex = null;

let currentLegacyItem = null;



if (btnCloseLegacy) {

    btnCloseLegacy.addEventListener("click", () => {

        legacyModal.style.cssText = "display: none !important;";

        

    });

}



function openLegacyEditor(originalIndex, item) {

    currentLegacyIndex = originalIndex;

    currentLegacyItem = item;

    

    document.getElementById("legacy-edit-text").value = item.text || JSON.stringify(item.rows || item.matches, null, 2);
    const legReq = document.getElementById("legacy-required");
    if (legReq) legReq.checked = Boolean(item && item.isRequired);

    

    if (legacyModal) {
        document.body.appendChild(legacyModal);
        legacyModal.classList.remove("hidden");
        legacyModal.style.cssText = "display: flex !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important; z-index: 2147483647 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.8) !important;";
        
        const mc = legacyModal.querySelector(".bg-surface-container-lowest") || legacyModal.querySelector("div");
        if (mc) {
            mc.classList.remove("scale-95");
            mc.style.cssText = "display: flex !important; visibility: visible !important; opacity: 1 !important; transform: scale(1) !important; background: white !important; position: relative !important; z-index: 2147483647 !important; width: 100% !important; max-width: 42rem !important; max-height: 90vh !important; overflow: hidden !important; flex-direction: column !important;";
        }
    }
}



if (btnSaveLegacy) {

    btnSaveLegacy.addEventListener("click", async () => {

        const newText = document.getElementById("legacy-edit-text").value;
        const legReq = document.getElementById("legacy-required");

        const categorySections = formSchema.filter(s => s.type === currentCategory);
        const sec = categorySections[currentStepIndex];
        const targetItem = (currentLegacyItem) ? currentLegacyItem : (sec && sec.content ? sec.content[currentLegacyIndex] : null);

        if (!targetItem) {
            showAlertModal("Erro: Item de destino não encontrado.");
            return;
        }

        if (legReq) {
            targetItem.isRequired = legReq.checked;
        }

        if (targetItem.element === "paragraph") {

            targetItem.text = newText;

        } else if (targetItem.element === "table" || targetItem.element === "checkbox_group") {

            try {

                if (targetItem.element === "table") {

                    targetItem.rows = JSON.parse(newText);

                } else {

                    targetItem.matches = JSON.parse(newText);

                }

            } catch (e) {

                showAlertModal("Formato JSON inválido para a tabela/lista. Verifique a sintaxe.");

                return;

            }

        }

        

        try {

            await saveSchemaToServer();
            initWizard();
            updateStepView();

            legacyModal.style.cssText = "display: none !important;";

        } catch (error) {

            console.error("Erro ao salvar:", error);

            showAlertModal("Erro de comunicação ao salvar edição.");

        }

    });

}





// =========================================================================
// MOTOR DE INTELIGÊNCIA ROTINA 1215: CONFRONTO, PREVIEW CARD E EXPORTAÇÃO
// =========================================================================
window.ia1215Results = null;
window.ia1215Resumo = null;
window.ia1215Autorizacoes = {};

function toggleAutorizacao1215(chaveAut, isChecked) {
    if (!window.ia1215Autorizacoes) window.ia1215Autorizacoes = {};
    window.ia1215Autorizacoes[chaveAut] = isChecked;
    if (window.ia1215Results) {
        window.ia1215Results.forEach(r => {
            if (r.chave_autorizacao === chaveAut) {
                r.autorizado = isChecked;
                if (isChecked && r.status === "requer_autorizacao") {
                    r.status = "vai_alterar";
                }
                if (!isChecked && r.status === "vai_alterar" && r.exige_autorizacao) {
                    r.status = "requer_autorizacao";
                }
            }
        });
    }
    updateStepView();
}

window.ia1215Exclusoes = new Set();
window.ia1215InclusoesForcadas = new Set();
let syncExclusoesTimeout = null;

function sincronizarExclusoes1215() {
    if (syncExclusoesTimeout) clearTimeout(syncExclusoesTimeout);
    syncExclusoesTimeout = setTimeout(() => {
        const cid = (typeof currentClientId !== "undefined" && currentClientId) ? currentClientId : "default";
        try {
            localStorage.setItem("gaia_1215_exclusoes_" + cid, JSON.stringify(Array.from(window.ia1215Exclusoes || [])));
        } catch(e) {}
    }, 200);
}

function toggleExclusaoItem1215(chaveItem, isChecked, checkboxEl) {
    if (!window.ia1215Exclusoes) window.ia1215Exclusoes = new Set();
    if (!window.ia1215InclusoesForcadas) window.ia1215InclusoesForcadas = new Set();

    if (isChecked) {
        window.ia1215Exclusoes.delete(chaveItem);
        window.ia1215InclusoesForcadas.add(chaveItem);
    } else {
        window.ia1215Exclusoes.add(chaveItem);
        window.ia1215InclusoesForcadas.delete(chaveItem);
    }

    if (window.ia1215Results) {
        const itemRes = window.ia1215Results.find(r => (r.chave_item === chaveItem || `${r.id_transacao_1215}_${r.id_entidade}_${r.id_campo_alvo}` === chaveItem));
        if (itemRes) {
            itemRes.selecionado = isChecked;
        }
    }

    const rowEl = checkboxEl ? checkboxEl.closest(".rotina1215-item-row") : document.querySelector(`.rotina1215-item-row[data-chave-item="${chaveItem}"]`);
    if (rowEl) {
        const badgeSpan = rowEl.querySelector(".status-badge");
        const linhasContainer = rowEl.querySelector(".linhas-container");
        const avisoDesmarcado = rowEl.querySelector(".linhas-desmarcado-aviso");
        const entityLabel = rowEl.querySelector("span.entity-name-label");

        if (isChecked) {
            rowEl.classList.remove("bg-slate-100/80", "border-slate-300", "opacity-60");
            rowEl.classList.add("bg-white/80", "border-emerald-200/80");
            if (badgeSpan) {
                badgeSpan.className = "status-badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300";
                badgeSpan.innerHTML = '<i class="fa-solid fa-circle-arrow-right text-emerald-600"></i> Vai Alterar';
            }
            if (linhasContainer) linhasContainer.classList.remove("hidden");
            if (avisoDesmarcado) avisoDesmarcado.classList.add("hidden");
            if (entityLabel) {
                entityLabel.classList.remove("text-slate-500", "line-through");
                entityLabel.classList.add("text-slate-800");
            }
        } else {
            rowEl.classList.add("bg-slate-100/80", "border-slate-300", "opacity-60");
            rowEl.classList.remove("bg-white/80", "border-emerald-200/80");
            if (badgeSpan) {
                badgeSpan.className = "status-badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-600 border border-slate-300";
                badgeSpan.innerHTML = '<i class="fa-solid fa-ban text-slate-500"></i> Desmarcado da Carga';
            }
            if (linhasContainer) linhasContainer.classList.add("hidden");
            if (avisoDesmarcado) avisoDesmarcado.classList.remove("hidden");
            if (entityLabel) {
                entityLabel.classList.add("text-slate-500", "line-through");
                entityLabel.classList.remove("text-slate-800");
            }
        }
    }

    sincronizarExclusoes1215();
}

function toggleTodosItensCard(btn, forceCheck) {
    const previewCard = btn.closest(".rotina1215-card-preview");
    if (!previewCard) return;
    const checkboxes = previewCard.querySelectorAll(".rotina1215-entity-chk");
    checkboxes.forEach(chk => {
        if (chk.checked !== forceCheck) {
            chk.checked = forceCheck;
            const chave = chk.getAttribute("data-chave");
            if (chave) toggleExclusaoItem1215(chave, forceCheck, chk);
        }
    });
}

function appendRotina1215PreviewCard(questionContainer, item, sectionState) {
    if (window.currentUser && window.currentUser.role === 'cliente') {
        return;
    }

    if (!window.ia1215Results || !Array.isArray(window.ia1215Results) || window.ia1215Results.length === 0) {
        return;
    }

    if (!window.ia1215Exclusoes) {
        window.ia1215Exclusoes = new Set();
    }

    const cleanText = (item.text || item.titleText || "").trim();
    const pId = item.id_pergunta;
    const itemRel = item.item_txt_relacionado;

    const matchingResults = window.ia1215Results.filter(r => {
        if (pId && r.id_pergunta === pId) return true;
        if (pId && r.ids_perguntas_relacionadas && r.ids_perguntas_relacionadas.includes(pId)) return true;
        if (itemRel && r.item_txt === itemRel) return true;
        if (cleanText && (r.pergunta_texto === cleanText || cleanText.includes(r.item_txt) || (r.pergunta_texto && cleanText.includes(r.pergunta_texto)))) return true;
        return false;
    });

    if (matchingResults.length === 0) return;

    const existing = questionContainer.querySelector(".rotina1215-card-preview");
    if (existing) existing.remove();

    const previewCard = document.createElement("div");
    previewCard.className = "rotina1215-card-preview mt-4 rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 text-emerald-950 shadow-sm transition-all";
    previewCard.style.cssText = "background-color: #f0fdf4 !important; border: 1.5px solid #86efac !important; border-radius: 14px !important;";

    const firstRes = matchingResults[0];
    const headerDiv = document.createElement("div");
    headerDiv.className = "flex flex-wrap items-center justify-between border-b border-emerald-200 pb-2 mb-3 gap-2";

    const hasAlteraveis = matchingResults.some(r => r.status === "vai_alterar" || (r.linhas_1215 && r.linhas_1215.length > 0));

    headerDiv.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 text-xs font-black">
                <i class="fa-solid fa-cube text-[11px]"></i>
            </span>
            <strong class="text-xs font-black uppercase tracking-wider text-emerald-900">
                Objeto ${firstRes.id_transacao_1215} (${firstRes.nivel || 'Entidade'}):
            </strong>
        </div>
        <div class="flex items-center gap-2 text-[11px] font-bold text-emerald-800 flex-wrap">
            <span class="bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Regra: ${firstRes.item_txt || 'Rotina 1215'}
            </span>
            ${hasAlteraveis ? `
            <div class="flex items-center gap-1.5 ml-2 border-l border-emerald-200 pl-2">
                <button type="button" class="text-[10px] bg-white text-emerald-800 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 shadow-2xs font-semibold cursor-pointer" onclick="toggleTodosItensCard(this, true)" title="Marcar todas as entidades para exportar nesta pergunta">
                    <i class="fa-regular fa-square-check"></i> Marcar todas
                </button>
                <button type="button" class="text-[10px] bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 px-2 py-0.5 rounded border border-slate-300 shadow-2xs font-semibold cursor-pointer" onclick="toggleTodosItensCard(this, false)" title="Desmarcar todas as entidades desta pergunta">
                    <i class="fa-regular fa-square"></i> Desmarcar todas
                </button>
            </div>
            ` : ''}
        </div>
    `;
    previewCard.appendChild(headerDiv);

    const listDiv = document.createElement("div");
    listDiv.className = "space-y-3";

    matchingResults.forEach(r => {
        const itemRow = document.createElement("div");
        const chaveItem = r.chave_item || `${r.id_transacao_1215}_${r.id_entidade}_${r.id_campo_alvo}`;
        const idEntidade = String(r.id_entidade || '').trim();
        const isDesmarcado = window.ia1215Exclusoes.has(chaveItem) || window.ia1215Exclusoes.has(`entidade_${idEntidade}`) || (r.selecionado === false && !window.ia1215InclusoesForcadas?.has(chaveItem));

        itemRow.className = `rotina1215-item-row rounded-lg p-3 border shadow-xs transition-all ${
            isDesmarcado ? 'bg-slate-100/80 border-slate-300 opacity-60' : 'bg-white/80 border-emerald-200/80'
        }`;
        itemRow.setAttribute("data-chave-item", chaveItem);

        let badgeHtml = "";
        if (isDesmarcado && (r.status === "vai_alterar" || (r.linhas_1215 && r.linhas_1215.length > 0))) {
            badgeHtml = '<span class="status-badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-600 border border-slate-300"><i class="fa-solid fa-ban text-slate-500"></i> Desmarcado da Carga</span>';
        } else if (r.status === "vai_alterar") {
            badgeHtml = '<span class="status-badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300"><i class="fa-solid fa-circle-arrow-right text-emerald-600"></i> Vai Alterar</span>';
        } else if (r.status === "sem_alteracao") {
            badgeHtml = '<span class="status-badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300"><i class="fa-solid fa-check text-slate-500"></i> Sem Alteração</span>';
        } else if (r.status === "revisar") {
            badgeHtml = '<span class="status-badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300"><i class="fa-solid fa-triangle-exclamation text-amber-600"></i> Revisar (Divergência)</span>';
        } else if (r.status === "requer_autorizacao") {
            badgeHtml = '<span class="status-badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300"><i class="fa-solid fa-user-shield text-purple-600"></i> Requer Autorização</span>';
        } else {
            badgeHtml = '<span class="status-badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300"><i class="fa-solid fa-clock text-sky-600"></i> Pendente</span>';
        }

        const valorBancoTxt = (r.valor_atual_banco !== "" && r.valor_atual_banco !== null) ? r.valor_atual_banco : "não gravado (vazio)";
        const valorEspTxt = r.valor_esperado !== null ? r.valor_esperado : "indefinido";

        let autorizacaoBoxHtml = "";
        if (r.exige_autorizacao) {
            const isChecked = Boolean(window.ia1215Autorizacoes && window.ia1215Autorizacoes[r.chave_autorizacao]);
            autorizacaoBoxHtml = `
                <div class="mt-2 p-2 bg-purple-50/80 rounded border border-purple-200 flex items-center justify-between text-xs">
                    <label class="flex items-center gap-2 font-bold text-purple-900 cursor-pointer">
                        <input type="checkbox" ${isChecked ? "checked" : ""} class="rounded text-purple-600 focus:ring-purple-500" onchange="toggleAutorizacao1215('${r.chave_autorizacao}', this.checked)">
                        <span>Autorizar aplicação desta regra pelo Consultor</span>
                    </label>
                    <span class="text-[10px] text-purple-700 italic">Campo com exigência de alçada</span>
                </div>
            `;
        }

        let linhasHtml = "";
        if (r.linhas_1215 && r.linhas_1215.length > 0 && r.status !== "sem_alteracao") {
            linhasHtml = `
                <div class="linhas-container mt-2 pt-2 border-t border-emerald-100 ${isDesmarcado ? 'hidden' : ''}">
                    <div class="text-[10px] uppercase font-bold text-emerald-800 tracking-wider mb-1 flex items-center gap-1">
                        <i class="fa-solid fa-terminal text-[10px]"></i> Linha Rotina 1215 Gerada:
                    </div>
                    <div class="font-mono text-xs bg-slate-900 text-emerald-400 p-2 rounded border border-slate-800 select-all overflow-x-auto">
                        ${r.linhas_1215.map(l => '<div>' + l + '</div>').join('')}
                    </div>
                </div>
                <div class="linhas-desmarcado-aviso mt-1.5 text-[11px] text-slate-500 italic flex items-center gap-1.5 ${isDesmarcado ? '' : 'hidden'}">
                    <i class="fa-solid fa-ban text-slate-400"></i> Desmarcado — esta linha não será exportada para a Rotina 1215.
                </div>
            `;
        } else if (r.status === "sem_alteracao") {
            linhasHtml = `
                <div class="mt-1.5 text-[11px] text-slate-500 italic flex items-center gap-1.5">
                    <i class="fa-solid fa-check text-emerald-600"></i> Sem alteração — o valor atual no banco já coincide com o valor configurado.
                </div>
            `;
        }

        const temAcaoDeCarga = (r.status === "vai_alterar" || (r.linhas_1215 && r.linhas_1215.length > 0));

        itemRow.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                    ${temAcaoDeCarga ? `
                        <input type="checkbox" ${!isDesmarcado ? 'checked' : ''} 
                               class="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer rotina1215-entity-chk" 
                               data-chave="${chaveItem}" 
                               title="Marque/Desmarque para incluir esta alteração no arquivo final da Rotina 1215" 
                               onchange="toggleExclusaoItem1215('${chaveItem}', this.checked, this)">
                    ` : ''}
                    <span class="entity-name-label text-xs font-bold ${isDesmarcado ? 'text-slate-500 line-through' : 'text-slate-800'}">${r.nome_entidade} (ID ${r.id_entidade})${r.literal_campo ? ` <span class="font-normal text-slate-600">• ${r.literal_campo} (${r.id_campo_alvo})</span>` : ''}:</span>
                    <span class="text-xs text-slate-600">
                        Atual [ <strong class="text-slate-800 font-mono">${valorBancoTxt}</strong> ] 
                        <i class="fa-solid fa-arrow-right text-[10px] text-emerald-600 mx-1"></i> 
                        Esperado [ <strong class="text-emerald-800 font-mono">${valorEspTxt}</strong> ]
                    </span>
                </div>
                ${badgeHtml}
            </div>
            ${autorizacaoBoxHtml}
            ${linhasHtml}
        `;

        listDiv.appendChild(itemRow);
    });

    previewCard.appendChild(listDiv);
    questionContainer.appendChild(previewCard);
}

function abrirModalFiltroEntidades1215() {
    if (!window.ia1215Results || !Array.isArray(window.ia1215Results) || window.ia1215Results.length === 0) {
        if (typeof showAlertModal === "function") {
            showAlertModal("Nenhum processamento de IA foi realizado ainda.\n\nPor favor, clique em 'Processar IA' no formulário para confrontar os dados com o CSV do Global Antares antes de filtrar.");
        }
        return;
    }

    const modal = document.getElementById("modal-filtro-entidades-1215");
    if (!modal) {
        console.error("Elemento modal-filtro-entidades-1215 não encontrado!");
        return;
    }

    renderizarListaFiltroEntidades();
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.style.display = "flex";
}

function fecharModalFiltroEntidades1215() {
    const modal = document.getElementById("modal-filtro-entidades-1215");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        modal.style.display = "none";
    }
    if (typeof updateStepView === "function") {
        updateStepView();
    }
}

function renderizarListaFiltroEntidades() {
    const container = document.getElementById("filtro-entidades-lista");
    const badgeLinhas = document.getElementById("filtro-badge-linhas");
    const badgeDesmarcadas = document.getElementById("filtro-badge-desmarcadas");
    if (!container) return;

    if (!window.ia1215ExpandedEntities) {
        window.ia1215ExpandedEntities = new Set();
    }
    const openDomCards = container.querySelectorAll(".rotina1215-ent-card");
    openDomCards.forEach(c => {
        const k = c.getAttribute("data-entity-key");
        const isHidden = c.querySelector(".accordion-content")?.classList.contains("hidden");
        if (k && !isHidden) {
            window.ia1215ExpandedEntities.add(k);
        }
    });

    container.innerHTML = "";

    const alteraveis = (window.ia1215Results || []).filter(r => r.status === "vai_alterar" || (r.linhas_1215 && r.linhas_1215.length > 0));

    if (alteraveis.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-500 text-xs">
                <i class="fa-solid fa-circle-check text-emerald-500 text-3xl mb-2"></i>
                <p class="font-bold text-slate-700">Nenhuma divergência a ser alterada encontrada!</p>
                <p>Todos os valores do banco coincidem com as respostas ou não geraram linhas.</p>
            </div>
        `;
        if (badgeLinhas) badgeLinhas.textContent = "0 linhas";
        if (badgeDesmarcadas) badgeDesmarcadas.textContent = "0 desmarcadas";
        return;
    }

    const entidadesMap = new Map();

    alteraveis.forEach(r => {
        const idEnt = String(r.id_entidade || "").trim();
        const nomeEnt = r.nome_entidade || `Entidade ${idEnt}`;
        const nivel = r.nivel || "Folha";
        const key = `${nivel}__${idEnt}`;

        if (!entidadesMap.has(key)) {
            entidadesMap.set(key, {
                id_entidade: idEnt,
                nome_entidade: nomeEnt,
                nivel: nivel,
                itens: []
            });
        }
        entidadesMap.get(key).itens.push(r);
    });

    let totalLinhasAtivas = 0;
    let totalDesmarcadas = 0;

    entidadesMap.forEach((entData, key) => {
        const idEnt = entData.id_entidade;
        const chaveGlobalEntidade = `entidade_${idEnt}`;
        const isGlobalExcluida = window.ia1215Exclusoes.has(chaveGlobalEntidade);

        let itensMarcados = 0;
        entData.itens.forEach(it => {
            const ch = it.chave_item || `${it.id_transacao_1215}_${it.id_entidade}_${it.id_campo_alvo}`;
            const isEx = window.ia1215Exclusoes.has(ch) || isGlobalExcluida || (it.selecionado === false && !window.ia1215InclusoesForcadas?.has(ch));
            if (!isEx) {
                itensMarcados++;
                totalLinhasAtivas += (it.linhas_1215 || []).length;
            } else {
                totalDesmarcadas += (it.linhas_1215 || []).length;
            }
        });

        const isExpanded = window.ia1215ExpandedEntities.has(key) || window.ia1215ExpandedEntities.has(idEnt);

        const entCard = document.createElement("div");
        entCard.className = "rotina1215-ent-card border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden transition-all";
        entCard.setAttribute("data-entity-key", key);

        const allChecked = (itensMarcados === entData.itens.length);
        const someChecked = (itensMarcados > 0 && itensMarcados < entData.itens.length);

        entCard.innerHTML = `
            <div class="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <input type="checkbox" 
                           class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer chk-entidade-mestre" 
                           data-entidade-id="${idEnt}" 
                           ${allChecked ? "checked" : ""} 
                           ${someChecked ? "indeterminate" : ""}
                           onchange="toggleEntidadeMestreModal('${idEnt}', this.checked)">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                                ${entData.nivel}
                            </span>
                            <strong class="text-sm font-bold text-slate-800">
                                ${entData.nome_entidade} (ID: ${idEnt})
                            </strong>
                        </div>
                        <span class="text-[11px] text-slate-500">
                            ${itensMarcados} de ${entData.itens.length} alteraçõe(s) selecionada(s) para exportação
                        </span>
                    </div>
                </div>
                <button type="button" class="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer" onclick="toggleAccordionEntidade(this)">
                    <span>${isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}</span> 
                    <i class="fa-solid fa-chevron-down text-[10px] transition-transform" style="${isExpanded ? 'transform: rotate(180deg)' : ''}"></i>
                </button>
            </div>
            <div class="p-3 bg-white space-y-2 ${isExpanded ? '' : 'hidden'} accordion-content border-t border-slate-100">
                ${entData.itens.map(it => {
                    const ch = it.chave_item || `${it.id_transacao_1215}_${it.id_entidade}_${it.id_campo_alvo}`;
                    const isEx = window.ia1215Exclusoes.has(ch) || isGlobalExcluida || (it.selecionado === false && !window.ia1215InclusoesForcadas?.has(ch));
                    return `
                        <div class="flex items-center justify-between p-2 rounded-lg border ${isEx ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-emerald-50/40 border-emerald-200'} text-xs">
                            <label class="flex items-center gap-2 cursor-pointer flex-1 mr-2">
                                <input type="checkbox" 
                                       class="rounded text-emerald-600 focus:ring-emerald-500 chk-item-modal" 
                                       data-chave="${ch}" 
                                       data-entidade-id="${idEnt}"
                                       ${!isEx ? 'checked' : ''} 
                                       onchange="toggleItemModal('${ch}', this.checked, '${idEnt}')">
                                <div>
                                    <span class="font-bold text-slate-800">${it.item_txt || it.pergunta_texto || 'Regra 1215'}</span>
                                    <div class="text-[10px] text-slate-500 font-mono">
                                        Atual: <span class="font-bold">${it.valor_atual_banco || '(vazio)'}</span> &rarr; Esperado: <span class="font-bold text-emerald-700">${it.valor_esperado}</span>
                                    </div>
                                </div>
                            </label>
                            <span class="font-mono text-[10px] px-2 py-0.5 rounded ${isEx ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800 font-bold'}">
                                ${(it.linhas_1215 || []).length} linha(s)
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.appendChild(entCard);
    });

    if (badgeLinhas) badgeLinhas.textContent = `${totalLinhasAtivas} linha(s) selecionada(s)`;
    if (badgeDesmarcadas) badgeDesmarcadas.textContent = `${totalDesmarcadas} desmarcada(s)`;
}

function toggleAccordionEntidade(btn) {
    const card = btn.closest(".rotina1215-ent-card") || btn.closest(".border");
    const content = card ? card.querySelector(".accordion-content") : null;
    const icon = btn.querySelector(".fa-chevron-down");
    const entKey = card ? card.getAttribute("data-entity-key") : null;
    if (!content) return;
    if (!window.ia1215ExpandedEntities) window.ia1215ExpandedEntities = new Set();

    if (content.classList.contains("hidden")) {
        content.classList.remove("hidden");
        btn.querySelector("span").textContent = "Ocultar detalhes";
        if (icon) icon.style.transform = "rotate(180deg)";
        if (entKey) window.ia1215ExpandedEntities.add(entKey);
    } else {
        content.classList.add("hidden");
        btn.querySelector("span").textContent = "Ver detalhes";
        if (icon) icon.style.transform = "rotate(0deg)";
        if (entKey) window.ia1215ExpandedEntities.delete(entKey);
    }
}

function toggleEntidadeMestreModal(idEntidade, isChecked) {
    const chaveGlobal = `entidade_${idEntidade}`;
    if (!window.ia1215Exclusoes) window.ia1215Exclusoes = new Set();
    if (!window.ia1215InclusoesForcadas) window.ia1215InclusoesForcadas = new Set();

    if (isChecked) {
        window.ia1215Exclusoes.delete(chaveGlobal);
    } else {
        window.ia1215Exclusoes.add(chaveGlobal);
    }

    const modal = document.getElementById("modal-filtro-entidades-1215");
    if (modal) {
        const itemCheckboxes = modal.querySelectorAll(`.chk-item-modal[data-entidade-id="${idEntidade}"]`);
        itemCheckboxes.forEach(chk => {
            chk.checked = isChecked;
            const ch = chk.getAttribute("data-chave");
            if (ch) {
                if (isChecked) {
                    window.ia1215Exclusoes.delete(ch);
                    window.ia1215InclusoesForcadas.add(ch);
                } else {
                    window.ia1215Exclusoes.add(ch);
                    window.ia1215InclusoesForcadas.delete(ch);
                }
            }
        });
    }

    (window.ia1215Results || []).forEach(r => {
        if (String(r.id_entidade || '').trim() === String(idEntidade).trim()) {
            r.selecionado = isChecked;
        }
    });

    sincronizarExclusoes1215();
    renderizarListaFiltroEntidades();
}

function toggleItemModal(chaveItem, isChecked, idEntidade) {
    if (!window.ia1215Exclusoes) window.ia1215Exclusoes = new Set();
    if (!window.ia1215InclusoesForcadas) window.ia1215InclusoesForcadas = new Set();

    if (isChecked) {
        window.ia1215Exclusoes.delete(chaveItem);
        window.ia1215InclusoesForcadas.add(chaveItem);
    } else {
        window.ia1215Exclusoes.add(chaveItem);
        window.ia1215InclusoesForcadas.delete(chaveItem);
    }

    if (window.ia1215Results) {
        const itemRes = window.ia1215Results.find(r => (r.chave_item === chaveItem || `${r.id_transacao_1215}_${r.id_entidade}_${r.id_campo_alvo}` === chaveItem));
        if (itemRes) {
            itemRes.selecionado = isChecked;
        }
    }

    sincronizarExclusoes1215();
    renderizarListaFiltroEntidades();
}

function marcarTodasEntidadesModal(forceCheck) {
    if (!window.ia1215Exclusoes) window.ia1215Exclusoes = new Set();
    if (!window.ia1215InclusoesForcadas) window.ia1215InclusoesForcadas = new Set();

    (window.ia1215Results || []).forEach(r => {
        r.selecionado = forceCheck;
        const ch = r.chave_item || `${r.id_transacao_1215}_${r.id_entidade}_${r.id_campo_alvo}`;
        const idEnt = String(r.id_entidade || '').trim();
        const chGlob = `entidade_${idEnt}`;
        if (forceCheck) {
            window.ia1215Exclusoes.delete(ch);
            window.ia1215Exclusoes.delete(chGlob);
            window.ia1215InclusoesForcadas.add(ch);
        } else {
            window.ia1215Exclusoes.add(ch);
            window.ia1215Exclusoes.add(chGlob);
            window.ia1215InclusoesForcadas.delete(ch);
        }
    });

    sincronizarExclusoes1215();
    renderizarListaFiltroEntidades();
}

function coletarRespostasDoFormulario() {
    const respostas = {};
    const ignoreFlags = {};

    if (!formSchema || !Array.isArray(formSchema)) return { respostas, ignoreFlags };

    formSchema.forEach(sec => {
        if (!sec.content || !Array.isArray(sec.content)) return;
        const secState = typeof getActiveSectionState === "function" 
            ? getActiveSectionState(sec.title) 
            : ((formState && formState[sec.type] && formState[sec.type][sec.title]) ? formState[sec.type][sec.title] : {});

        sec.content.forEach(item => {
            const cleanKey = (item.text || item.titleText || "").trim();
            const pId = item.id_pergunta || cleanKey;
            if (!pId && !cleanKey) return;

            if (secState[cleanKey + "_ignore"] === true || secState[pId + "_ignore"] === true) {
                ignoreFlags[pId] = true;
                if (cleanKey) ignoreFlags[cleanKey] = true;
                if (item.item_txt_relacionado) ignoreFlags[item.item_txt_relacionado] = true;
            }

            let val = secState[pId];
            if (val === undefined || val === null || val === "") {
                val = secState[cleanKey];
            }

            let detalhe = secState[pId + "_detalhe"] || secState[cleanKey + "_detalhe"] || "";

            if (item.responseType === "checkbox" && (item.options || []).length > 0) {
                const marcados = [];
                item.options.forEach(opt => {
                    const optLabel = opt.label || opt.rotulo;
                    const optChave = opt.chave || optLabel;
                    if (secState[optLabel] === true || secState[optChave] === true) {
                        marcados.push(optChave);
                    }
                });
                if (marcados.length > 0) val = marcados;
            }

            const isDirfQuestion = (pId === "dados-adicionais-responsavel-dirf") || 
                                   (cleanKey && (cleanKey.includes("Nome do Responsavel Legal (DIRF)") || cleanKey.includes("Nome do Responsável Legal (DIRF)")));
            if (isDirfQuestion) {
                let nome = secState["responsavel_dirf_nome"] || "";
                let cpf = secState["responsavel_dirf_cpf"] || "";
                let email = secState["responsavel_dirf_email"] || "";
                if (!nome && !cpf && !email && val && typeof val === "string") {
                    const p = extrairCamposResponsavelLegado(val);
                    nome = p.nome;
                    cpf = p.cpf;
                    email = p.email;
                }
                if (nome || cpf || email || val) {
                    const rObj = {
                        resposta: {
                            nome: nome,
                            cpf: cpf,
                            email: email,
                            texto_completo: val || [nome, cpf, email].filter(Boolean).join(", ")
                        },
                        valor_especificado: detalhe
                    };
                    respostas[pId] = rObj;
                    if (cleanKey) respostas[cleanKey] = rObj;
                    if (item.item_txt_relacionado) respostas[item.item_txt_relacionado] = rObj;
                    return;
                }
            }

            if (val !== undefined && val !== null && val !== "") {
                const rObj = {
                    resposta: val,
                    valor_especificado: detalhe
                };
                respostas[pId] = rObj;
                if (cleanKey) respostas[cleanKey] = rObj;
                if (item.item_txt_relacionado) respostas[item.item_txt_relacionado] = rObj;
            }
        });
    });

    return { respostas, ignoreFlags };
}

function initRotina1215UI() {
    const btnUploadCsv = document.getElementById("btn-upload-csv-ga");
    const inputCsv = document.getElementById("input-csv-ga");
    const filenameSpan = document.getElementById("csv-ga-filename");
    const infoDiv = document.getElementById("csv-ga-info");
    const countSpan = document.getElementById("csv-ga-count");
    const btnClear = document.getElementById("btn-clear-csv-ga");
    const btnProcess = document.getElementById("btn-global-process-ia");

    const btnExtrair = document.getElementById("btn-extrair-1215");
    const menuExtrair = document.getElementById("dropdown-extrair-menu");
    const btnDownTxt = document.getElementById("btn-download-1215-txt");
    const btnDownAuditoria = document.getElementById("btn-download-1215-auditoria");
    const btnAbrirFiltro = document.getElementById("btn-abrir-filtro-entidades");

    const modalFiltro = document.getElementById("modal-filtro-entidades-1215");
    const btnCloseFiltro = document.getElementById("btn-close-filtro-1215");
    const btnFecharFiltro = document.getElementById("btn-fechar-filtro-1215");
    const btnFiltroMarcarTodos = document.getElementById("btn-filtro-marcar-todos");
    const btnFiltroDesmarcarTodos = document.getElementById("btn-filtro-desmarcar-todos");
    const btnModalDownTxt = document.getElementById("btn-modal-download-txt");
    const btnModalDownAuditoria = document.getElementById("btn-modal-download-auditoria");

    if (btnExtrair && menuExtrair) {
        btnExtrair.addEventListener("click", (e) => {
            e.stopPropagation();
            menuExtrair.classList.toggle("hidden");
        });
        document.addEventListener("click", (e) => {
            if (!menuExtrair.contains(e.target) && e.target !== btnExtrair) {
                menuExtrair.classList.add("hidden");
            }
        });
    }

    function downloadTextFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 150);
    }

    function exportarArquivoTxt1215() {
        if (menuExtrair) menuExtrair.classList.add("hidden");
        if (!window.ia1215Results || window.ia1215Results.length === 0) {
            showAlertModal("Nenhum confronto da Rotina 1215 foi gerado ainda.\n\nPor favor, envie o CSV do Global Antares no menu lateral e clique em 'Processar IA'.");
            return;
        }
        const cid = (typeof currentClientId !== "undefined" && currentClientId) ? currentClientId : "cliente";
        const txt = window.Rotina1215Engine.gerarArquivo1215(
            { resultados: window.ia1215Results },
            window.ia1215Autorizacoes || {},
            window.ia1215Exclusoes || []
        );
        if (!txt || txt.trim() === "") {
            showAlertModal("Atenção: Não há nenhuma linha para exportar com os filtros e seleções atuais.");
            return;
        }
        downloadTextFile(txt, `Importacao_Rotina_1215_${cid}.txt`, "text/plain;charset=windows-1252");
    }

    function exportarRelatorioAuditoria1215() {
        if (menuExtrair) menuExtrair.classList.add("hidden");
        if (!window.ia1215Results || window.ia1215Results.length === 0) {
            showAlertModal("Nenhum confronto da Rotina 1215 foi gerado ainda.\n\nPor favor, envie o CSV do Global Antares no menu lateral e clique em 'Processar IA'.");
            return;
        }
        const cid = (typeof currentClientId !== "undefined" && currentClientId) ? currentClientId : "cliente";
        const csv = window.Rotina1215Engine.gerarRelatorioAuditoriaCsv(
            { resultados: window.ia1215Results },
            window.ia1215Exclusoes || []
        );
        downloadTextFile(csv, `Relatorio_Auditoria_1215_${cid}.csv`, "text/csv;charset=utf-8;");
    }

    if (btnDownTxt) btnDownTxt.addEventListener("click", exportarArquivoTxt1215);
    if (btnModalDownTxt) btnModalDownTxt.addEventListener("click", exportarArquivoTxt1215);
    if (btnDownAuditoria) btnDownAuditoria.addEventListener("click", exportarRelatorioAuditoria1215);
    if (btnModalDownAuditoria) btnModalDownAuditoria.addEventListener("click", exportarRelatorioAuditoria1215);

    if (btnAbrirFiltro) {
        btnAbrirFiltro.addEventListener("click", (e) => {
            if (e) e.stopPropagation();
            if (menuExtrair) menuExtrair.classList.add("hidden");
            abrirModalFiltroEntidades1215();
        });
    }

    if (btnCloseFiltro) btnCloseFiltro.addEventListener("click", fecharModalFiltroEntidades1215);
    if (btnFecharFiltro) btnFecharFiltro.addEventListener("click", fecharModalFiltroEntidades1215);
    if (btnFiltroMarcarTodos) btnFiltroMarcarTodos.addEventListener("click", () => marcarTodasEntidadesModal(true));
    if (btnFiltroDesmarcarTodos) btnFiltroDesmarcarTodos.addEventListener("click", () => marcarTodasEntidadesModal(false));

    if (btnUploadCsv && inputCsv) {
        btnUploadCsv.addEventListener("click", () => {
            inputCsv.click();
        });

        inputCsv.addEventListener("change", async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            btnUploadCsv.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-emerald-600"></i> Analisando...';

            try {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const csvText = event.target.result;
                    if (window.Rotina1215Engine) {
                        await window.Rotina1215Engine.init();
                        const rows = window.Rotina1215Engine.parseCsvGA(csvText);
                        window.ia1215CsvRows = rows;

                        const entidadesUnicas = new Set(rows.map(r => r.ID_ENTIDADE).filter(Boolean));
                        filenameSpan.textContent = file.name;
                        countSpan.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${rows.length} linhas (${entidadesUnicas.size} entidades)`;
                        infoDiv.classList.remove("hidden");
                        btnUploadCsv.innerHTML = `<i class="fa-solid fa-file-csv text-base text-emerald-600"></i> <span id="csv-ga-filename">${file.name}</span>`;

                        if (btnProcess) {
                            btnProcess.disabled = false;
                            btnProcess.classList.remove("opacity-50", "cursor-not-allowed");
                            btnProcess.classList.add("hover:bg-[#a68241]", "cursor-pointer");
                            btnProcess.title = "Pronto para processar confronto IA";
                        }

                        showAlertModal(`Arquivo CSV do Global Antares carregado com sucesso!\n\n${rows.length} linhas analisadas para ${entidadesUnicas.size} entidade(s).\nO botão "Processar IA" já está liberado.`);
                    }
                };
                reader.readAsText(file, "UTF-8");
            } catch (err) {
                console.error(err);
                showAlertModal("Erro na leitura do arquivo CSV: " + err.message);
                btnUploadCsv.innerHTML = '<i class="fa-solid fa-file-csv text-base text-emerald-600"></i> <span>Carregar CSV do GA</span>';
            }
        });
    }

    if (btnClear) {
        btnClear.addEventListener("click", () => {
            if (inputCsv) inputCsv.value = "";
            if (filenameSpan) filenameSpan.textContent = "Carregar CSV do GA";
            if (infoDiv) infoDiv.classList.add("hidden");
            window.ia1215CsvRows = null;
            if (btnProcess) {
                btnProcess.disabled = true;
                btnProcess.classList.add("opacity-50", "cursor-not-allowed");
                btnProcess.classList.remove("hover:bg-[#a68241]", "cursor-pointer");
            }
        });
    }

    if (btnProcess) {
        btnProcess.addEventListener("click", async () => {
            if (btnProcess.disabled) return;

            btnProcess.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processando IA...';
            btnProcess.disabled = true;

            try {
                if (typeof saveDraft === "function") saveDraft();

                if (!window.ia1215CsvRows || window.ia1215CsvRows.length === 0) {
                    showAlertModal("Nenhum arquivo CSV do Global Antares foi carregado previamente. Por favor, carregue o CSV no menu lateral.");
                    return;
                }

                if (window.Rotina1215Engine) {
                    await window.Rotina1215Engine.init();
                    const { respostas, ignoreFlags } = coletarRespostasDoFormulario();

                    const data = window.Rotina1215Engine.processarConfronto1215(
                        respostas,
                        window.ia1215CsvRows,
                        window.ia1215Autorizacoes || {},
                        ignoreFlags,
                        new Date(),
                        window.ia1215Exclusoes ? Array.from(window.ia1215Exclusoes) : []
                    );

                    window.ia1215Results = data.resultados;
                    window.ia1215Resumo = data.resumo;

                    if (!window.ia1215Exclusoes) window.ia1215Exclusoes = new Set();
                    (data.resultados || []).forEach(r => {
                        if (r.selecionado === false && r.chave_item) {
                            window.ia1215Exclusoes.add(r.chave_item);
                        }
                    });

                    updateStepView();

                    const r = data.resumo;
                    const msg = `Processamento de Inteligência Concluído!\n\n` +
                        `• Total de itens confrontados: ${r.total_confrontados}\n` +
                        `• Vai alterar (gerará 1215): ${r.vai_alterar}\n` +
                        `• Sem alteração (já coincide): ${r.sem_alteracao}\n` +
                        `• Requer autorização do consultor: ${r.requer_autorizacao}\n` +
                        `• Revisar / Divergências: ${r.revisar}\n` +
                        `• Pendentes de resposta: ${r.pendente}\n\n` +
                        `Os cards de pré-visualização foram inseridos abaixo de cada pergunta do formulário.\n` +
                        `Você pode marcar/desmarcar entidades específicas diretamente em cada pergunta ou usar o botão 'Extrair arquivo > Filtrar Carga por Entidade'.`;

                    showAlertModal(msg);
                }
            } catch (err) {
                console.error(err);
                showAlertModal("Erro ao processar IA: " + err.message);
            } finally {
                btnProcess.innerHTML = '<i class="fa-solid fa-bolt"></i> Processar IA';
                btnProcess.disabled = false;
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof initRotina1215UI === "function") {
        initRotina1215UI();
    }
    const lockBtn = document.getElementById("btn-toggle-lock-client");
    if (lockBtn) {
        lockBtn.addEventListener("click", async () => {
            if (!currentClientId) {
                showAlertModal("Por favor, selecione um cliente primeiro.");
                return;
            }
            const newLockStatus = !isCurrentClientLocked;
            try {
                const res = await fetch("/api/lock-status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ client_id: currentClientId, is_locked: newLockStatus })
                });
                const data = await res.json();
                if (data.success) {
                    isCurrentClientLocked = data.is_locked;
                    updateLockUI(); updateDoubtsUI();
                    initWizard();
                    updateStepView();
                    showAlertModal(isCurrentClientLocked 
                        ? "Formulário bloqueado para o cliente com sucesso!" 
                        : "Formulário liberado para edições do cliente com sucesso!");
                } else {
                    showAlertModal("Erro ao alterar status de bloqueio: " + (data.error || "Erro desconhecido"));
                }
            } catch (e) {
                console.error(e);
                showAlertModal("Erro ao comunicar com o servidor.");
            }
        });
    }
});


// ============ CENTRAL DE DÚVIDAS DO CONSULTOR ============

function getFlaggedHelpItems() {
    const flagged = [];
    if (!formState || typeof formState !== "object") return flagged;

    function walk(obj, pathCat, pathTopic) {
        if (!obj || typeof obj !== "object") return;

        Object.keys(obj).forEach(key => {
            const val = obj[key];
            if (key.startsWith("_") && key !== "_groupAnswers") {
                return;
            }

            if (key.endsWith("_need_help") && val === true) {
                const cleanKey = key.replace("_need_help", "");
                const cat = pathCat || currentCategory || "Folha de Pagamento";
                let qText = cleanKey;
                let foundTopic = pathTopic || "Geral";
                let foundCategory = cat;

                formSchema.forEach(sec => {
                    if (sec.content) {
                        const itemObj = sec.content.find(i => {
                            const t = (i.text || i.titleText || "").replace(/[.#$[{}\]\n\r]/g, "_").substring(0, 100);
                            return t === cleanKey || i.text === cleanKey || i.titleText === cleanKey;
                        });
                        if (itemObj) {
                            qText = itemObj.text || itemObj.titleText || cleanKey;
                            foundTopic = sec.title;
                            foundCategory = sec.type || cat;
                        }
                    }
                });

                const already = flagged.find(f => f.topic === foundTopic && f.questionKey === cleanKey);
                if (!already) {
                    flagged.push({
                        category: foundCategory,
                        topic: foundTopic,
                        questionKey: cleanKey,
                        questionText: qText,
                        response: "Dúvida sinalizada pelo cliente"
                    });
                }
            } else if (typeof val === "object" && val !== null) {
                let nextCat = pathCat;
                let nextTopic = pathTopic;
                if (!pathCat && (key === "Folha de Pagamento" || key === "Benefícios" || key === "Folha")) {
                    nextCat = key;
                } else if (!pathTopic && key !== "_groupAnswers") {
                    nextTopic = key;
                }
                walk(val, nextCat, nextTopic);
            }
        });
    }

    walk(formState, "", "");
    return flagged;
}

function updateDoubtsUI() {
    const doubtsBtn = document.getElementById("btn-client-doubts");
    const countText = document.getElementById("doubts-count-text");
    if (!doubtsBtn || !countText) return;

    if (currentClientId && (currentUser?.role === "consultor" || currentUser?.role === "admin")) {
        doubtsBtn.classList.remove("hidden");
        const flagged = getFlaggedHelpItems();
        if (flagged.length > 0) {
            doubtsBtn.className = "bg-amber-500 text-amber-950 border border-amber-600 rounded px-3 py-1 text-xs font-extrabold hover:bg-amber-400 transition-all flex items-center gap-1.5 shadow-md cursor-pointer animate-pulse";
            countText.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-950"></i> ${flagged.length} Dúvida(s) Sinalizada(s)`;
        } else {
            doubtsBtn.className = "bg-surface-variant/50 text-on-surface-variant border border-outline-variant/30 rounded px-3 py-1 text-xs font-bold hover:bg-surface-variant transition-all flex items-center gap-1.5 shadow-sm cursor-pointer opacity-75";
            countText.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600"></i> Nenhuma Dúvida`;
        }
    } else {
        doubtsBtn.classList.add("hidden");
    }
}

function openDoubtsModal() {
    const modal = document.getElementById("doubts-modal");
    const container = document.getElementById("doubts-list-container");
    if (!modal || !container) return;

    const flagged = getFlaggedHelpItems();
    container.innerHTML = "";

    if (flagged.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10">
                <i class="fa-solid fa-circle-check text-4xl text-emerald-500 mb-3"></i>
                <h4 class="text-base font-bold text-on-surface">Nenhuma dúvida sinalizada!</h4>
                <p class="text-xs text-on-surface-variant mt-1">O cliente não marcou nenhum item como "Ajuda/Dúvida" até o momento.</p>
            </div>
        `;
    } else {
        flagged.forEach(item => {
            const card = document.createElement("div");
            card.className = "p-4 bg-surface-container-low border border-amber-500/30 rounded-xl hover:border-amber-500 transition-all shadow-xs flex flex-col gap-2";
            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-900 border border-amber-500/30">
                        ${item.category} • ${item.topic}
                    </span>
                    <button type="button" class="btn-goto-question text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer">
                        Ir para a Pergunta <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </button>
                </div>
                <h4 class="text-sm font-bold text-on-surface">${item.questionText}</h4>
                <div class="text-xs bg-surface p-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant">
                    <strong class="block text-[10px] uppercase text-outline mb-0.5">Resposta Atual do Cliente:</strong>
                    <span>${item.response === "Nenhuma resposta preenchida" ? "<em>Sem resposta ainda</em>" : item.response}</span>
                </div>
            `;

            card.querySelector(".btn-goto-question").addEventListener("click", () => {
                modal.style.cssText = "display: none !important;";
                navigateToQuestion(item.category, item.topic, item.questionText);
            });

            container.appendChild(card);
        });
    }

    modal.style.cssText = "display: flex !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important; z-index: 2147483647 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.8) !important;";
}

function navigateToQuestion(category, topicTitle, questionText) {
    // 1. Switch category if needed
    if (category && category !== currentCategory) {
        currentCategory = category;
        const catBtn = document.querySelector(`.cat-btn[data-category="${category}"]`);
        if (catBtn) {
            document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
            catBtn.classList.add("active");
            if (currentCategoryLabel) currentCategoryLabel.textContent = category;
        }
    }

    // 2. Find step index for topic
    const sections = getCategorySections();
    const stepIdx = sections.findIndex(s => s.title === topicTitle);
    if (stepIdx >= 0) {
        currentStepIndex = stepIdx;
        initWizard();
        updateStepView();

        // 3. Highlight question card after view updates
        setTimeout(() => {
            const cards = document.querySelectorAll(".form-section");
            cards.forEach(c => {
                if (c.textContent.includes(questionText)) {
                    c.scrollIntoView({ behavior: "smooth", block: "center" });
                    c.style.cssText += "outline: 4px solid #f59e0b !important; animation: pulse 1.5s infinite;";
                    setTimeout(() => {
                        c.style.animation = "";
                    }, 4000);
                }
            });
            // Ensure consultant top bar is visible
            const topBar = document.getElementById("consultant-top-bar");
            if (topBar && (currentUser?.role === "consultor" || currentUser?.role === "admin")) {
                topBar.classList.remove("hidden");
                topBar.style.display = "flex";
            }
        }, 200);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const doubtsBtn = document.getElementById("btn-client-doubts");
    if (doubtsBtn) {
        doubtsBtn.addEventListener("click", openDoubtsModal);
    }
    document.querySelectorAll(".btn-close-doubts").forEach(btn => {
        btn.addEventListener("click", () => {
            const modal = document.getElementById("doubts-modal");
            if (modal) modal.style.cssText = "display: none !important;";
        });
    });
});

// --- Added for Profile System ---
document.addEventListener("DOMContentLoaded", () => {
    const profileSelect = document.getElementById("profile-select");
    if (profileSelect) {
        profileSelect.addEventListener("change", async (e) => {
            currentProfileId = e.target.value || null;
            await loadServerState();
            initWizard();
        });
    }
    
    const btnManage = document.getElementById("btn-manage-profiles");
    const modalManage = document.getElementById("manage-profiles-modal");
    if (btnManage && modalManage) {
        btnManage.addEventListener("click", () => {
            modalManage.classList.remove("hidden");
        });
        document.querySelector(".close-manage-profiles").addEventListener("click", () => {
            modalManage.classList.add("hidden");
        });
        document.getElementById("btn-create-profile").addEventListener("click", async () => {
            const name = document.getElementById("new-profile-name").value.trim();
            const parent = document.getElementById("new-profile-parent").value || null;
            if (name) {
                const id = "p_" + Date.now();
                clientProfiles.push({id, name, parent_id: parent, state: {}});
                document.getElementById("new-profile-name").value = "";
                await saveProfiles();
                updateProfileUI();
            }
        });
    }
});
// --------------------------------


function renderCompositeTable(container, item, sectionState, cleanText) {
    const tableHtml = `
        <div class="composite-table-container mt-4 p-4 border rounded-lg bg-gray-50" id="ct_${cleanText.replace(/[^a-zA-Z0-9]/g, '')}">
            <h4 class="font-bold mb-2">Preencha as datas de postergação:</h4>
            <div class="table-rows space-y-2"></div>
            <button type="button" class="mt-2 btn-add-row bg-primary text-white px-3 py-1 rounded text-sm"><i class="fa fa-plus"></i> Adicionar nova linha</button>
        </div>
    `;
    
    // Check if the previous element is a "Sim/Nao" trigger (simplification for the specific request)
    // We will render it but hide it initially, and listen to the entire form for a "Sim" on the trigger question.
    
    const div = document.createElement("div");
    div.innerHTML = tableHtml;
    container.appendChild(div);
    
    const tableRows = div.querySelector('.table-rows');
    const btnAdd = div.querySelector('.btn-add-row');
    
    let rowsData = [];
    try {
        if(sectionState[cleanText]) {
            rowsData = JSON.parse(sectionState[cleanText]);
            if(!Array.isArray(rowsData)) rowsData = [];
        }
    } catch(e) { rowsData = []; }
    
    function saveRows() {
        sectionState[cleanText] = JSON.stringify(rowsData);
    }
    
    function renderRow(rowData, index) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "flex flex-wrap gap-2 items-center bg-white p-2 border rounded shadow-sm relative";
        rowDiv.innerHTML = `
            <input type="text" placeholder="Dia" class="border rounded p-1 w-16" value="${rowData.dia || ''}" data-field="dia">
            <select class="border rounded p-1 w-24" data-field="mes">
                <option value="">Mês</option>
                <option value="Janeiro" ${rowData.mes==='Janeiro'?'selected':''}>Janeiro</option>
                <option value="Fevereiro" ${rowData.mes==='Fevereiro'?'selected':''}>Fevereiro</option>
                <option value="Dezembro" ${rowData.mes==='Dezembro'?'selected':''}>Dezembro</option>
            </select>
            <input type="text" placeholder="Descrição (Ex: Natal)" class="border rounded p-1 flex-1" value="${rowData.descricao || ''}" data-field="descricao">
            <select class="border rounded p-1" data-field="tipo">
                <option value="">Tipo de Descanso</option>
                <option value="Nenhum" ${rowData.tipo==='Nenhum'?'selected':''}>Nenhum</option>
                <option value="Férias" ${rowData.tipo==='Férias'?'selected':''}>Férias</option>
                <option value="Recesso" ${rowData.tipo==='Recesso'?'selected':''}>Recesso</option>
            </select>
            <select class="border rounded p-1" data-field="modo">
                <option value="">Modo de Descanso</option>
                <option value="Nenhum" ${rowData.modo==='Nenhum'?'selected':''}>Nenhum</option>
                <option value="Normal" ${rowData.modo==='Normal'?'selected':''}>Normal</option>
                <option value="Coletivo" ${rowData.modo==='Coletivo'?'selected':''}>Coletivo</option>
            </select>
            <select class="border rounded p-1" data-field="sindicato">
                <option value="1">1 - Todos</option>
                <option value="2" ${rowData.sindicato==='2'?'selected':''}>2 - Específico</option>
            </select>
            <input type="text" placeholder="Qual?" class="border rounded p-1 w-24 ${rowData.sindicato==='2'?'':'hidden'}" value="${rowData.sindicato_texto || ''}" data-field="sindicato_texto">
            <button type="button" class="text-red-500 font-bold ml-2 px-2" title="Remover">X</button>
        `;
        
        rowDiv.querySelectorAll('input, select').forEach(inp => {
            inp.addEventListener('change', (e) => {
                rowsData[index][e.target.getAttribute('data-field')] = e.target.value;
                if(e.target.getAttribute('data-field') === 'sindicato') {
                    const txt = rowDiv.querySelector('[data-field="sindicato_texto"]');
                    if(e.target.value === '2') txt.classList.remove('hidden');
                    else txt.classList.add('hidden');
                }
                saveRows();
            });
        });
        
        rowDiv.querySelector('button').addEventListener('click', () => {
            rowsData.splice(index, 1);
            saveRows();
            refreshTable();
        });
        
        tableRows.appendChild(rowDiv);
    }
    
    function refreshTable() {
        tableRows.innerHTML = '';
        rowsData.forEach((r, i) => renderRow(r, i));
    }
    
    btnAdd.addEventListener('click', () => {
        rowsData.push({dia: '', mes: '', descricao: '', tipo: '', modo: '', sindicato: '1', sindicato_texto: ''});
        saveRows();
        refreshTable();
    });
    
    if(rowsData.length === 0) {
        rowsData.push({dia: '', mes: '', descricao: '', tipo: '', modo: '', sindicato: '1', sindicato_texto: ''});
        saveRows();
    }
    
    refreshTable();
}

// --- DYNAMIC COMPOSITE TABLE LOGIC ---

// Override the old renderCompositeTable with the dynamic one
function renderCompositeTable(container, item, sectionState, cleanText) {
    const cols = item.compositeColumns || [];
    
    // Aggressive fallback killer: if this is a composite table, find any generic textareas/inputs added by the legacy system and nuke them
    setTimeout(() => {
        const fallbacks = container.querySelectorAll("textarea.form-input, input.form-input[type='text']");
        fallbacks.forEach(el => {
            // only nuke if it's a direct child or close, don't nuke our own inputs
            if(el.parentElement === container) {
                el.style.display = 'none';
                el.style.opacity = 0;
            }
        });
    }, 50);
    
    if(cols.length === 0) {
        // Render a warning so they know they need to add columns
        container.innerHTML += `<div class="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm mt-4">Nenhuma coluna configurada para esta tabela. Clique em "Editar" e adicione colunas.</div>`;
        return;
    } // Se não tem colunas, não renderiza nada

    const tableHtml = `
        <div class="composite-table-container mt-4 p-4 border rounded-lg bg-gray-50" id="ct_${cleanText.replace(/[^a-zA-Z0-9]/g, '')}">
            <h4 class="font-bold mb-2 text-sm text-gray-700">Preencha a tabela:</h4>
            <div class="table-rows space-y-2"></div>
            <button type="button" class="mt-2 btn-add-row bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90">+ Adicionar nova linha</button>
        </div>
    `;
    
    const div = document.createElement("div");
    div.innerHTML = tableHtml;
    container.appendChild(div);
    
    const tableRows = div.querySelector('.table-rows');
    const btnAdd = div.querySelector('.btn-add-row');
    
    let rowsData = [];
    try {
        if(sectionState[cleanText]) {
            rowsData = JSON.parse(sectionState[cleanText]);
            if(!Array.isArray(rowsData)) rowsData = [];
        }
    } catch(e) { rowsData = []; }
    
    function saveRows() {
        sectionState[cleanText] = JSON.stringify(rowsData);
    }
    
    function renderRow(rowData, index) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "flex flex-wrap gap-2 items-center bg-white p-2 border rounded shadow-sm relative";
        
        cols.forEach(col => {
            const val = rowData[col.name] || '';
            if (col.type === 'dropdown') {
                const wrap = document.createElement('div');
                wrap.className = 'flex gap-1 items-center';
                
                const select = document.createElement('select');
                select.className = "border rounded p-1 text-sm bg-white";
                select.setAttribute('data-field', col.name);
                select.innerHTML = `<option value="">${col.name}</option>` + 
                    (col.options || []).map(opt => `<option value="${opt}" ${val===opt?'selected':''}>${opt}</option>`).join('');
                wrap.appendChild(select);
                
                if (col.triggerOption) {
                    const txtExtra = document.createElement('input');
                    txtExtra.type = 'text';
                    txtExtra.className = 'border rounded p-1 text-sm w-32';
                    txtExtra.placeholder = 'Especifique...';
                    txtExtra.setAttribute('data-field', col.name + '_extra');
                    txtExtra.value = rowData[col.name + '_extra'] || '';
                    if (val !== col.triggerOption) txtExtra.classList.add('hidden');
                    wrap.appendChild(txtExtra);
                    
                    select.addEventListener('change', (e) => {
                        if (e.target.value === col.triggerOption) txtExtra.classList.remove('hidden');
                        else txtExtra.classList.add('hidden');
                    });
                }
                rowDiv.appendChild(wrap);
            } else {
                const input = document.createElement('input');
                input.type = "text";
                input.className = "border rounded p-1 text-sm flex-1 min-w-[100px]";
                input.placeholder = col.name;
                input.value = val;
                input.setAttribute('data-field', col.name);
                rowDiv.appendChild(input);
            }
        });
        
        const btnRm = document.createElement('button');
        btnRm.type = "button";
        btnRm.className = "text-red-500 font-bold ml-2 px-2 hover:bg-red-50 rounded";
        btnRm.innerText = "X";
        btnRm.title = "Remover linha";
        btnRm.onclick = () => {
            rowsData.splice(index, 1);
            saveRows();
            refreshTable();
        };
        rowDiv.appendChild(btnRm);
        
        rowDiv.querySelectorAll('input, select').forEach(inp => {
            inp.addEventListener('change', (e) => {
                rowsData[index][e.target.getAttribute('data-field')] = e.target.value;
                saveRows();
            });
        });
        
        tableRows.appendChild(rowDiv);
    }
    
    function refreshTable() {
        tableRows.innerHTML = '';
        rowsData.forEach((r, i) => renderRow(r, i));
    }
    
    btnAdd.addEventListener('click', () => {
        let newRow = {};
        cols.forEach(c => newRow[c.name] = '');
        rowsData.push(newRow);
        saveRows();
        refreshTable();
    });
    
    if(rowsData.length === 0) {
        let newRow = {};
        cols.forEach(c => newRow[c.name] = '');
        rowsData.push(newRow);
        saveRows();
    }
    refreshTable();
}

// Hook into the radio buttons to show/hide the builder
document.addEventListener("DOMContentLoaded", () => {
    // In case DOMContentLoaded already fired
    setupCompositeHooks();
});
setTimeout(setupCompositeHooks, 1000);

window.window.currentCompositeCols = window.currentCompositeCols || [];

function setupCompositeHooks() {
    const radios = document.querySelectorAll('input[name="q-type"]');
    if(!radios.length) return;
    
    radios.forEach(r => {
        r.addEventListener('change', (e) => {
            const builder = document.querySelector("#q-composite-builder-container");
            if(!builder) return;
            if(e.target.value === 'composite_table') {
                builder.classList.remove('hidden');
                renderCompositeBuilder();
            } else {
                builder.classList.add('hidden');
            }
        });
    });
    
    const btnAdd = document.getElementById('btn-add-composite-col');
    if(btnAdd && !btnAdd.hasAttribute('data-hooked')) {
        btnAdd.setAttribute('data-hooked', 'true');
        btnAdd.addEventListener('click', () => {
            window.window.currentCompositeCols.push({name: 'Nova Coluna', type: 'text', options: []});
            renderCompositeBuilder();
        });
    }
}

function renderCompositeBuilder() {
    const list = document.getElementById('composite-columns-list');
    if(!list) return;
    list.innerHTML = '';
    
    window.window.currentCompositeCols.forEach((col, idx) => {
        const div = document.createElement('div');
        div.className = "flex gap-2 items-center bg-white p-2 rounded border border-gray-200";
        
        // Name
        const inpName = document.createElement('input');
        inpName.type = 'text';
        inpName.value = col.name;
        inpName.className = "border rounded p-1 text-sm w-32";
        inpName.placeholder = "Nome da coluna";
        inpName.onchange = (e) => { col.name = e.target.value; };
        
        // Type
        const selType = document.createElement('select');
        selType.className = "border rounded p-1 text-sm w-24 bg-white";
        selType.innerHTML = `<option value="text" ${col.type==='text'?'selected':''}>Texto</option><option value="dropdown" ${col.type==='dropdown'?'selected':''}>Lista</option>`;
        
        // Options (if dropdown)
        const optsWrap = document.createElement('div');
        optsWrap.className = 'flex flex-col gap-1 flex-1';
        if(col.type !== 'dropdown') optsWrap.style.display = 'none';
        
        const inpOpts = document.createElement('input');
        inpOpts.type = 'text';
        inpOpts.className = "border rounded p-1 text-sm w-full";
        inpOpts.placeholder = "Opções separadas por vírgula";
        inpOpts.value = (col.options || []).join(', ');
        
        const inpTrigger = document.createElement('input');
        inpTrigger.type = 'text';
        inpTrigger.className = "border rounded p-1 text-sm w-full";
        inpTrigger.placeholder = "Exibir campo texto caso a opção seja igual a...";
        inpTrigger.value = col.triggerOption || '';
        
        optsWrap.appendChild(inpOpts);
        optsWrap.appendChild(inpTrigger);
        
        selType.onchange = (e) => { 
            col.type = e.target.value; 
            optsWrap.style.display = col.type === 'dropdown' ? 'flex' : 'none';
        };
        inpOpts.onchange = (e) => {
            col.options = e.target.value.split(',').map(s => s.trim()).filter(s => s);
        };
        inpTrigger.onchange = (e) => {
            col.triggerOption = e.target.value.trim();
        };
        
        // Remove
        const btnRm = document.createElement('button');
        btnRm.className = "text-red-500 font-bold px-2 hover:bg-red-50 rounded";
        btnRm.innerText = "X";
        btnRm.onclick = () => {
            window.window.currentCompositeCols.splice(idx, 1);
            renderCompositeBuilder();
        };
        
        div.appendChild(inpName);
        div.appendChild(selType);
        div.appendChild(optsWrap);
        div.appendChild(btnRm);
        list.appendChild(div);
    });
}

// Hook into openQuestionEditor to load currentCompositeCols
const originalOpenQuestionEditor = window.openQuestionEditor;
if (originalOpenQuestionEditor && !window.openQuestionEditorHooked) {
    window.openQuestionEditorHooked = true;
    window.openQuestionEditor = function(itemIndex, element) {
        originalOpenQuestionEditor(itemIndex, element);
        
        // After original logic, check if it's composite_table
        setTimeout(() => {
            const section = getCategorySections()[currentStepIndex];
            const realItem = (itemIndex >= 0 && section && section.content && section.content[itemIndex])
                ? section.content[itemIndex]
                : (element || null);
            
            const builder = document.querySelector("#q-composite-builder-container");
            if (realItem && realItem.responseType === 'composite_table') {
                const radio = document.querySelector('input[name="q-type"][value="composite_table"]');
                if(radio) radio.checked = true;
                const optsContainer = document.getElementById("q-options-container");
                if(optsContainer) optsContainer.classList.add("hidden");
                if(builder) builder.classList.remove('hidden');
                window.currentCompositeCols = JSON.parse(JSON.stringify(realItem.compositeColumns || []));
            } else {
                if(builder) builder.classList.add('hidden');
                window.currentCompositeCols = [];
                // Se for criar uma nova pergunta e já tiver selecionado Tabela Dinamica
                const checked = document.querySelector('input[name="q-type"]:checked');
                if(checked && checked.value === 'composite_table') {
                     if(builder) builder.classList.remove('hidden');
                     // Exemplo padrão
                     window.currentCompositeCols = [
                         {name: 'Dia', type: 'text'}, 
                         {name: 'Mês', type: 'dropdown', options: ['Janeiro', 'Fevereiro', 'Dezembro']},
                         {name: 'Descrição', type: 'text'}
                     ];
                }
            }
            renderCompositeBuilder();
        }, 100);
    };
}

// Hook into saveQuestion to save compositeColumns
// Since btn-save-question has an event listener, we can just intercept the save function if it exists,
// or we can add a click listener that runs before/after.
// Actually, the best way to intercept the save without rewriting the whole function is to hook the button click,
// but since the original click handler reads the DOM and saves to formSchema, we can just add a click handler 
// that runs afterwards (using setTimeout) to inject compositeColumns into the last saved item.
// Wait, the original save handler might close the modal immediately.
// Let's monkeypatch `formSchema` push/update logic? No, too hard.
// Let's just find the item in formSchema based on q-topic-index and q-item-index.
document.addEventListener("DOMContentLoaded", () => {
    const btnSave = document.getElementById("btn-save-question");
    if(btnSave) {
        btnSave.addEventListener("click", () => {
            const selectedRadio = document.querySelector('input[name="q-type"]:checked');
            if(selectedRadio && selectedRadio.value === 'composite_table') {
                // Wait for the original save handler to finish
                setTimeout(() => {
                    let topicIdx = parseInt(document.getElementById("q-topic-index").value);
                    const itemIdx = parseInt(document.getElementById("q-item-index").value);
                    
                    if (isNaN(topicIdx) || topicIdx < 0 || topicIdx >= formSchema.length) {
                        const curSec = getCategorySections()[currentStepIndex];
                        topicIdx = formSchema.findIndex(s => s === curSec || (s.type === currentCategory && s.title === curSec.title));
                    }
                    if (topicIdx >= 0 && formSchema[topicIdx]) {
                        const section = formSchema[topicIdx];
                        // If itemIdx was -1, it pushed to the end
                        const realIdx = itemIdx >= 0 ? itemIdx : section.content.length - 1;
                        if(section.content[realIdx]) {
                            section.content[realIdx].compositeColumns = JSON.parse(JSON.stringify(window.currentCompositeCols));
                            console.log("Saved compositeColumns to schema", section.content[realIdx]);
                        }
                    }
                }, 100);
            }
        });
    }
});

// =========================================================================
// DICIONÁRIO E CONSULTA RÁPIDA DA ROTINA 1215 (EXCLUSIVO CONSULTOR / ADMIN)
// =========================================================================
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let dicionario1215Data = null;
let dicFilterState = {
    search: "",
    nivel: "todos",
    transacao: ""
};

async function carregarDicionario1215(forceReload = false) {
    if (dicionario1215Data && !forceReload) return dicionario1215Data;
    try {
        if (window.Rotina1215Engine) {
            const raw = await window.Rotina1215Engine.getDicionario();
            const campos = raw.campos || (Array.isArray(raw) ? raw : []);
            const txSet = new Set();
            campos.forEach(c => {
                if (c.id_transacao_1215) txSet.add(c.id_transacao_1215);
                if (c.transacao) txSet.add(c.transacao);
            });
            dicionario1215Data = {
                total: campos.length,
                campos: campos,
                transacoes: Array.from(txSet).sort(),
                is_custom: false
            };
        }
        
        // Atualizar Select de Transações
        const selectTx = document.getElementById("select-filtro-transacao");
        if (selectTx && dicionario1215Data.transacoes) {
            const currentVal = selectTx.value;
            selectTx.innerHTML = `<option value="">Todas Transações</option>`;
            dicionario1215Data.transacoes.forEach(tx => {
                const opt = document.createElement("option");
                opt.value = tx;
                opt.textContent = `Tx ${tx}`;
                selectTx.appendChild(opt);
            });
            selectTx.value = currentVal;
        }

        // Atualizar Badge de Status e Botão de Restaurar
        const badgeStatus = document.getElementById("badge-dic-status");
        const btnRestore = document.getElementById("btn-dic-restaurar-padrao");
        if (badgeStatus) {
            if (dicionario1215Data.is_custom) {
                badgeStatus.textContent = `${dicionario1215Data.total} campos (Personalizado)`;
                badgeStatus.className = "bg-amber-400 text-amber-950 font-bold px-2 py-0.5 rounded-full text-[10px] shadow-xs";
            } else {
                badgeStatus.textContent = `${dicionario1215Data.total} campos`;
                badgeStatus.className = "bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full";
            }
        }
        if (btnRestore) {
            if (dicionario1215Data.is_custom) {
                btnRestore.classList.remove("hidden");
            } else {
                btnRestore.classList.add("hidden");
            }
        }

        return dicionario1215Data;
    } catch (e) {
        console.error("Erro ao carregar dicionário 1215:", e);
        showDicionarioToast("Erro ao conectar com o dicionário 1215 no servidor.", true);
        return null;
    }
}

function updateDicionario1215Visibility() {
    const fab = document.getElementById("fab-dicionario-1215");
    const drawer = document.getElementById("drawer-dicionario-1215");
    const isConsultant = (window.currentUser?.role === "consultor" || window.currentUser?.role === "admin");

    if (isConsultant) {
        if (fab) {
            fab.classList.remove("hidden");
            fab.style.display = "flex";
        }
    } else {
        if (fab) {
            fab.classList.add("hidden");
            fab.style.display = "none";
        }
        if (drawer) {
            drawer.classList.add("hidden");
            drawer.style.display = "none";
        }
    }
}

function filtrarECarregarDicionario() {
    const container = document.getElementById("dic-resultados-container");
    const counter = document.getElementById("dic-contador-resultados");
    if (!container || !dicionario1215Data || !dicionario1215Data.campos) return;

    const termo = (dicFilterState.search || "").trim().toLowerCase();
    const nivelFiltro = dicFilterState.nivel || "todos";
    const txFiltro = dicFilterState.transacao || "";

    const resultados = dicionario1215Data.campos.filter(item => {
        // 1. Filtro por Nível
        if (nivelFiltro !== "todos") {
            const itemNivel = String(item.nivel || "").toLowerCase();
            if (nivelFiltro.toLowerCase() === "grupo") {
                if (!itemNivel.includes("grupo")) return false;
            } else if (!itemNivel.includes(nivelFiltro.toLowerCase())) {
                return false;
            }
        }

        // 2. Filtro por Transação
        if (txFiltro) {
            const itemTx = String(item.id_transacao || "").trim();
            if (itemTx !== txFiltro) return false;
        }

        // 3. Busca Universal Flexível em TODAS as propriedades do item
        if (!termo) return true;

        for (const [key, val] of Object.entries(item)) {
            if (val === null || val === undefined) continue;
            let strVal = "";
            if (typeof val === "object") {
                strVal = JSON.stringify(val).toLowerCase();
            } else {
                strVal = String(val).toLowerCase();
            }
            if (strVal.includes(termo)) return true;
        }
        return false;
    });

    renderResultadosDicionario(resultados, termo);
}

function renderResultadosDicionario(resultados, termo) {
    const container = document.getElementById("dic-resultados-container");
    const counter = document.getElementById("dic-contador-resultados");
    if (!container) return;

    container.innerHTML = "";
    const totalDisponivel = dicionario1215Data?.total || dicionario1215Data?.campos?.length || 0;
    if (counter) {
        counter.textContent = `Mostrando ${resultados.length} de ${totalDisponivel} campos`;
    }

    // Se nenhum item foi localizado: Apresentar "Não localizado" conforme solicitado
    if (resultados.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div class="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center text-xl mb-3 shadow-xs">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <h4 class="text-base font-extrabold text-rose-600 tracking-tight">Não localizado</h4>
                <p class="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
                    Nenhum campo ou transação corresponde ao termo
                    ${termo ? `<strong class="text-slate-800 font-mono bg-slate-200 px-1 py-0.5 rounded">"${escapeHtml(termo)}"</strong>` : ""}.
                </p>
                <div class="mt-4">
                    <button type="button" id="btn-reset-dic-search" class="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                        <i class="fa-solid fa-rotate-left mr-1"></i> Limpar Pesquisa
                    </button>
                </div>
            </div>
        `;
        const btnReset = document.getElementById("btn-reset-dic-search");
        if (btnReset) {
            btnReset.addEventListener("click", () => {
                const inp = document.getElementById("input-busca-dicionario-1215");
                if (inp) {
                    inp.value = "";
                    inp.dispatchEvent(new Event("input"));
                    inp.focus();
                }
            });
        }
        return;
    }

    // Construção dos Cards
    resultados.forEach(campo => {
        const card = document.createElement("div");
        card.className = "bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all text-xs flex flex-col gap-2 group";

        const idCampo = String(campo.id_campo || "N/A");
        const transacao = String(campo.id_transacao || "N/A");
        const nivel = String(campo.nivel || "Geral");
        const literal = String(campo.literal || campo.nome_fisico || "Sem descrição");
        const nomeFisico = String(campo.nome_fisico || "");
        const campoChave = String(campo.id_campo_chave || "");
        const itemTxt = String(campo.item_txt || "");
        const pergunta = String(campo.pergunta || "");

        // Atributos customizados adicionais que vierem no JSON
        const standardKeys = new Set(["id_campo", "id_transacao", "nivel", "literal", "nome_fisico", "id_campo_chave", "item_txt", "fonte", "pergunta"]);
        const customEntries = Object.entries(campo).filter(([k]) => !standardKeys.has(k));

        // Badges do topo
        const badgesHtml = `
            <div class="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <button type="button" class="btn-copy-val bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-colors" data-copy="${escapeHtml(idCampo)}" title="Clique para copiar ID">
                        <span>ID: ${escapeHtml(idCampo)}</span>
                        <i class="fa-regular fa-copy text-[10px] opacity-70"></i>
                    </button>
                    <button type="button" class="btn-filter-tx bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-colors" data-tx="${escapeHtml(transacao)}" title="Filtrar por esta transação">
                        <span>Tx: ${escapeHtml(transacao)}</span>
                    </button>
                    <span class="bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded-md font-medium text-[10px]">
                        ${escapeHtml(nivel)}
                    </span>
                </div>
                ${itemTxt ? `<span class="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Item: ${escapeHtml(itemTxt)}</span>` : ""}
            </div>
        `;

        // Descrição e Nome Físico
        const contentHtml = `
            <div>
                <h5 class="font-bold text-slate-900 text-xs leading-snug">${escapeHtml(literal)}</h5>
                ${nomeFisico && nomeFisico !== literal ? `
                    <div class="flex items-center gap-1 mt-1">
                        <span class="text-[10px] text-slate-400 font-semibold">Nome Físico:</span>
                        <code class="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[280px]" title="${escapeHtml(nomeFisico)}">${escapeHtml(nomeFisico)}</code>
                        <button type="button" class="btn-copy-val text-slate-400 hover:text-slate-600 text-[11px] p-0.5 cursor-pointer ml-0.5" data-copy="${escapeHtml(nomeFisico)}" title="Copiar Nome Físico">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </div>
                ` : ""}
            </div>
        `;

        // Detalhes extras (Campo Chave e Pergunta)
        let detailsHtml = "";
        if (campoChave || pergunta) {
            detailsHtml = `
                <div class="bg-slate-50 p-2 rounded-lg border border-slate-200/70 text-[11px] space-y-1 text-slate-600">
                    ${campoChave ? `
                        <div class="flex items-start gap-1">
                            <strong class="text-[10px] text-slate-400 uppercase tracking-wider min-w-[70px]">Chave:</strong>
                            <span class="font-mono text-slate-700 font-semibold">${escapeHtml(campoChave)}</span>
                        </div>
                    ` : ""}
                    ${pergunta ? `
                        <div class="flex items-start gap-1">
                            <strong class="text-[10px] text-slate-400 uppercase tracking-wider min-w-[70px]">Pergunta:</strong>
                            <span class="text-slate-800 italic">"${escapeHtml(pergunta)}"</span>
                        </div>
                    ` : ""}
                </div>
            `;
        }

        // Se houver atributos customizados do JSON enviado pelo consultor
        let customHtml = "";
        if (customEntries.length > 0) {
            customHtml = `
                <div class="pt-1.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                    ${customEntries.map(([k, v]) => {
                        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
                        return `
                            <span class="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded font-medium">
                                <strong>${escapeHtml(k)}:</strong> ${escapeHtml(valStr)}
                            </span>
                        `;
                    }).join("")}
                </div>
            `;
        }

        card.innerHTML = badgesHtml + contentHtml + detailsHtml + customHtml;

        // Eventos dos botões de cópia
        card.querySelectorAll(".btn-copy-val").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const copyText = btn.getAttribute("data-copy");
                if (copyText) {
                    navigator.clipboard.writeText(copyText);
                    showDicionarioToast(`Copiado: "${copyText}"`);
                }
            });
        });

        // Evento de filtro por transação rápida ao clicar no badge
        const btnTx = card.querySelector(".btn-filter-tx");
        if (btnTx) {
            btnTx.addEventListener("click", (e) => {
                e.stopPropagation();
                const tx = btnTx.getAttribute("data-tx");
                const sel = document.getElementById("select-filtro-transacao");
                if (sel && tx) {
                    sel.value = tx;
                    sel.dispatchEvent(new Event("change"));
                }
            });
        }

        container.appendChild(card);
    });
}

function showDicionarioToast(msg, isError = false) {
    const toast = document.getElementById("dic-feedback-toast");
    const txt = document.getElementById("dic-feedback-text");
    if (!toast || !txt) return;

    txt.textContent = msg;
    toast.className = isError 
        ? "px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between"
        : "px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between";
    toast.classList.remove("hidden");

    if (window._dicToastTimeout) clearTimeout(window._dicToastTimeout);
    window._dicToastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, 4500);
}

function initDicionario1215() {
    const btnToggle = document.getElementById("btn-toggle-dicionario-1215");
    const drawer = document.getElementById("drawer-dicionario-1215");
    const btnClose = document.getElementById("btn-close-dicionario-1215");
    const inputBusca = document.getElementById("input-busca-dicionario-1215");
    const btnClear = document.getElementById("btn-clear-busca-dicionario");
    const selectTx = document.getElementById("select-filtro-transacao");
    const inputUpload = document.getElementById("input-upload-dicionario");
    const btnRestore = document.getElementById("btn-dic-restaurar-padrao");
    const btnCloseToast = document.getElementById("btn-close-dic-feedback");

    if (!btnToggle || !drawer) return;

    // Abrir / Fechar Drawer
    const toggleDrawer = async (open = null) => {
        const isHidden = drawer.classList.contains("hidden");
        const shouldOpen = open !== null ? open : isHidden;

        if (shouldOpen) {
            drawer.classList.remove("hidden");
            drawer.style.display = "flex";
            await carregarDicionario1215();
            filtrarECarregarDicionario();
            if (inputBusca) {
                setTimeout(() => inputBusca.focus(), 100);
            }
        } else {
            drawer.classList.add("hidden");
            drawer.style.display = "none";
        }
    };

    btnToggle.addEventListener("click", () => toggleDrawer());
    if (btnClose) btnClose.addEventListener("click", () => toggleDrawer(false));

    // Fechar ao pressionar tecla ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !drawer.classList.contains("hidden")) {
            toggleDrawer(false);
        }
    });

    // Campo de busca em tempo real com debounce de 100ms
    let searchTimeout = null;
    if (inputBusca) {
        inputBusca.addEventListener("input", (e) => {
            const val = e.target.value;
            if (btnClear) {
                if (val.trim()) btnClear.classList.remove("hidden");
                else btnClear.classList.add("hidden");
            }

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                dicFilterState.search = val;
                filtrarECarregarDicionario();
            }, 100);
        });
    }

    if (btnClear) {
        btnClear.addEventListener("click", () => {
            if (inputBusca) {
                inputBusca.value = "";
                inputBusca.dispatchEvent(new Event("input"));
                inputBusca.focus();
            }
        });
    }

    // Filtros de Nível (Chips)
    document.querySelectorAll("#dic-nivel-chips .chip-nivel").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#dic-nivel-chips .chip-nivel").forEach(b => {
                b.className = "chip-nivel bg-slate-200 text-slate-700 hover:bg-slate-300 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer";
            });
            btn.className = "chip-nivel active bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer";
            
            dicFilterState.nivel = btn.getAttribute("data-nivel") || "todos";
            filtrarECarregarDicionario();
        });
    });

    // Filtro por Transação (Select)
    if (selectTx) {
        selectTx.addEventListener("change", (e) => {
            dicFilterState.transacao = e.target.value;
            filtrarECarregarDicionario();
        });
    }

    // Fechar toast
    if (btnCloseToast) {
        btnCloseToast.addEventListener("click", () => {
            const toast = document.getElementById("dic-feedback-toast");
            if (toast) toast.classList.add("hidden");
        });
    }

    // Upload de Novo JSON Customizado
    if (inputUpload) {
        inputUpload.addEventListener("change", async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                showDicionarioToast("Lendo e validando arquivo JSON...");
                const text = await file.text();
                let parsed;
                try {
                    parsed = JSON.parse(text);
                } catch (parseErr) {
                    showDicionarioToast("Erro: O arquivo selecionado não é um JSON válido.", true);
                    inputUpload.value = "";
                    return;
                }

                const res = await fetch("/api/rotina1215/dicionario/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ data: parsed })
                });

                const resData = await res.json();
                if (res.ok && resData.success) {
                    showDicionarioToast(resData.message || "Dicionário personalizado carregado!");
                    await carregarDicionario1215(true);
                    filtrarECarregarDicionario();
                } else {
                    showDicionarioToast(resData.error || "Erro ao salvar dicionário.", true);
                }
            } catch (err) {
                console.error("Erro no upload do dicionário:", err);
                showDicionarioToast(`Erro no envio: ${err.message}`, true);
            } finally {
                inputUpload.value = "";
            }
        });
    }

    // Restaurar Dicionário Original Padrão
    if (btnRestore) {
        btnRestore.addEventListener("click", async () => {
            if (!confirm("Deseja restaurar o dicionário original padrão da Rotina 1215?")) return;

            try {
                showDicionarioToast("Restaurando dicionário padrão...");
                const res = await fetch("/api/rotina1215/dicionario/restaurar-padrao", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({})
                });
                const resData = await res.json();
                if (res.ok && resData.success) {
                    showDicionarioToast("Dicionário padrão restaurado com sucesso!");
                    await carregarDicionario1215(true);
                    filtrarECarregarDicionario();
                } else {
                    showDicionarioToast(resData.error || "Erro ao restaurar dicionário.", true);
                }
            } catch (err) {
                console.error("Erro ao restaurar:", err);
                showDicionarioToast(`Erro: ${err.message}`, true);
            }
        });
    }

    // Atualiza visibilidade com base no perfil inicial
    updateDicionario1215Visibility();
}

// Inicializar na carga do documento
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDicionario1215);
} else {
    initDicionario1215();
}

