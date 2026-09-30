
const NAT_JUR_OPTIONS = `
<option value="0">0 - Nenhum</option>
<option value="1">1 - Órgão Público do Poder Executivo Federal</option>
<option value="2">2 - Órgão Público do Poder Exec Estadual ou D.Federal</option>
<option value="3">3 - Órgão Público do Poder Executivo Municipal</option>
<option value="4">4 - Órgão Público do Poder Legislativo Federal</option>
<option value="5">5 - Órgão Público do Poder Legislativo Estadual ou DF</option>
<option value="6">6 - Órgão Público do Poder Legislativo Municipal</option>
<option value="7">7 - Órgão Público do Poder Judiciário Federal</option>
<option value="8">8 - Órgão Público do Poder Judiciário Estadual</option>
<option value="9">9 - Órgão Público do Poder Judiciário Trabalhista</option>
<option value="10">10 - Autarquia Federal</option>
<option value="11">11 - Autarquia Estadual ou do Distrito Federal</option>
<option value="12">12 - Autarquia Municipal</option>
<option value="13">13 - Fundação Federal</option>
<option value="14">14 - Fundação Estadual ou do Distrito Federal</option>
<option value="15">15 - Fundação Municipal</option>
<option value="16">16 - Órgão Público Autônomo Federal</option>
<option value="17">17 - Órgão Público Autônomo Estadual/Distrito Federal</option>
<option value="18">18 - Órgão Público Autônomo Municipal</option>
<option value="19">19 - Comissão Polinacional</option>
<option value="20">20 - Fundo Público</option>
<option value="21">21 - Associação Pública</option>
<option value="22">22 - Empresa Pública</option>
<option value="23">23 - Sociedade de Economia Mista</option>
<option value="24">24 - Sociedade Anônima Aberta</option>
<option value="25">25 - Sociedade Anônima Fechada</option>
<option value="26">26 - Sociedade Empresária Limitada</option>
<option value="27">27 - Sociedade Empresária em Nome Coletivo</option>
<option value="28">28 - Sociedade Empresária em Comandita Simples</option>
<option value="29">29 - Sociedade Empresária em Comandita por Ações</option>
<option value="30">30 - Sociedade em Conta de Participação</option>
<option value="31">31 - Empresário Individual</option>
<option value="32">32 - Cooperativa</option>
<option value="33">33 - Consórcio de Sociedades</option>
<option value="34">34 - Grupo de Sociedades</option>
<option value="35">35 - Estabelecimento, no Brasil, de Sociedade Estrangeira</option>
<option value="36">36 - Estabelecimento, no Brasil, de Empresa Binacional Argentino-Brasileira</option>
<option value="37">37 - Empresa Domiciliada no Exterior</option>
<option value="38">38 - Clube/Fundo de Investimento</option>
<option value="39">39 - Sociedade Simples Pura</option>
<option value="40">40 - Sociedade Simples Limitada</option>
<option value="41">41 - Sociedade Simples em Nome Coletivo</option>
<option value="42">42 - Sociedade Simples em Comandita Simples</option>
<option value="43">43 - Empresa Individual de Responsabilidade Limitada (de Natureza Empresária)</option>
<option value="44">44 - Empresa Individual de Responsabilidade Limitada (de Natureza Simples)</option>
<option value="45">45 - Serviço Notarial e Registral (Cartório)</option>
<option value="46">46 - Fundação Privada</option>
<option value="47">47 - Serviço Social Autônomo</option>
<option value="48">48 - Associação Privada</option>
<option value="49">49 - Sindicato</option>
<option value="50">50 - Organização Religiosa</option>
<option value="51">51 - Comunidade Indígena</option>
<option value="52">52 - Fundo Privado</option>
<option value="53">53 - Candidato a Cargo Político Eletivo</option>
<option value="54">54 - Entidade Sindical</option>
<option value="55">55 - Consórcio de Empregadores</option>
<option value="56">56 - Órgão de Direção Nacional de Partido Político</option>
<option value="57">57 - Órgão de Direção Regional de Partido Político</option>
<option value="58">58 - Órgão de Direção Local de Partido Político</option>
<option value="59">59 - Comitê Financeiro de Partido Político</option>
<option value="60">60 - Frente Plebiscitária ou Referendária</option>
<option value="61">61 - Frente Parlamentar</option>
<option value="62">62 - Condomínio Edilício</option>
<option value="63">63 - Comissão de Conciliação Prévia</option>
<option value="64">64 - Entidade de Mediação e Arbitragem</option>
<option value="65">65 - Partido Político</option>
<option value="66">66 - Empreendedor Individual - MEI</option>
<option value="67">67 - Representação Diplomática Estrangeira</option>
<option value="68">68 - Órgão de Representação Est.de Organização Internacional ou Intergovernamental</option>
<option value="69">69 - Produtor Rural (Pessoa Física)</option>
<option value="70">70 - Outras instituições extraterritoriais</option>
<option value="71">71 - Segurado Especial</option>
`;
const TIPO_INSCR_OPTIONS = `
<option value="1">1 - CNPJ</option>
<option value="2">2 - CEI</option>
<option value="3">3 - CPF</option>
<option value="4">4 - NIT</option>
<option value="5">5 - CAEPF</option>
<option value="6">6 - CNO</option>
`;
const TIPO_END_OPTIONS = `
<option value="1">1 - Avenida</option>
<option value="2">2 - Alameda</option>
<option value="3">3 - Praça</option>
<option value="4">4 - Rodovia</option>
<option value="5">5 - Estrada</option>
<option value="6">6 - Rua</option>
<option value="7">7 - Viela</option>
<option value="8">8 - Travessa</option>
<option value="9">9 - Largo</option>
`;
const ESTADO_OPTIONS = `
<option value="1">1 - Acre</option>
<option value="2">2 - Alagoas</option>
<option value="3">3 - Amazonas</option>
<option value="4">4 - Amapá</option>
<option value="5">5 - Bahia</option>
<option value="6">6 - Ceará</option>
<option value="7">7 - Distrito Federal</option>
<option value="8">8 - Espírito Santo</option>
<option value="9">9 - Goiás</option>
<option value="10">10 - Maranhão</option>
<option value="11">11 - Minas Gerais</option>
<option value="12">12 - Mato Grosso do Sul</option>
<option value="13">13 - Mato Grosso</option>
<option value="14">14 - Pará</option>
<option value="15">15 - Paraíba</option>
<option value="16">16 - Pernambuco</option>
<option value="17">17 - Piauí</option>
<option value="18">18 - Paraná</option>
<option value="19">19 - Rio de Janeiro</option>
<option value="20">20 - Rio Grande do Norte</option>
<option value="21">21 - Rondônia</option>
<option value="22">22 - Roraima</option>
<option value="23">23 - Rio Grande do Sul</option>
<option value="24">24 - Santa Catarina</option>
<option value="25">25 - Sergipe</option>
<option value="26">26 - São Paulo</option>
<option value="27">27 - Tocantins</option>
`;

        function toggleExpand(btn) {
            const card = btn.closest('.data-card');
            const content = card.querySelector('.expanded-content');
            
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                btn.innerHTML = '<i class="fas fa-chevron-down"></i> Editar';
            } else {
                content.classList.add('active');
                btn.innerHTML = '<i class="fas fa-chevron-up"></i> Recolher';
            }
        }

        // Feature: Real Excel Download with Multiple Sheets and Dropdowns
        async function downloadTemplate() {
            if (typeof ExcelJS === 'undefined') {
                showToast("Carregando biblioteca Excel...", "info");
                return;
            }

            const wb = new ExcelJS.Workbook();
            
            // Aba 1: Template
            const wsTemplate = wb.addWorksheet("Template de Importação");
            const headers = [
                "Continente", "País", "Grupo de Empresas", "Data de Vigência da Empresa", "Razão Social da Empresa", "Nome Interno", "Apelido da Empresa",
                "Prefixo do CNPJ", "Considerar Optante pelo Programa Empresa Cidadã", "Natureza Jurídica - Código",
                "Natureza Jurídica - Descrição", "Local", "Data de Vigência do Local", "Apelido do Local",
                "Considerar Matriz", "Tipo de Inscrição - Código", "Tipo de Inscrição - Descrição", "Sufixo do CNPJ",
                "CEP", "Tipo de Endereço - Código", "Tipo de Endereço - Descrição", "Endereço Base", "Endereço Número",
                "Endereço Complemento", "Bairro - Código", "Bairro - Descrição", "Município - Código Interno",
                "Município - Descrição", "Código do Município (IBGE)", "Estado - Código", "Estado - Descrição"
            ];
            wsTemplate.addRow(headers);
            wsTemplate.columns = headers.map(h => ({width: h.length + 5}));
            
            const sampleData = [
                "01/01/2026", "EMPRESA FICTÍCIA BRASIL LTDA", "EMPRESA FICTÍCIA", "FICTICIA",
                "00.000.000", "Sim", "26 - Sociedade Empresária Limitada", "", "Matriz SP",
                "01/01/2026", "Matriz SP", "Sim", "1", "CNPJ", "0001-00",
                "01001-000", "6 - Rua", "", "da Sé", "1",
                "Lado Ímpar", "0", "Sé", "1", "São Paulo", "3550308", "26 - São Paulo", ""
            ];
            wsTemplate.addRow(sampleData);

            // Aba 2: Opções
            const wsOptions = wb.addWorksheet("Códigos e Opções");
            wsOptions.addRow(["Natureza Jurídica", "Tipo de Endereço", "Estado"]);
            
            const extractOptions = (htmlStr) => {
                const sel = document.createElement('select');
                sel.innerHTML = htmlStr;
                return Array.from(sel.options).map(o => o.text);
            };
            
            const natJurOptions = extractOptions(NAT_JUR_OPTIONS);
            const tipoEndOptions = extractOptions(TIPO_END_OPTIONS);
            const estadoOptions = extractOptions(ESTADO_OPTIONS);
            
            const maxLen = Math.max(natJurOptions.length, tipoEndOptions.length, estadoOptions.length);
            for (let i = 0; i < maxLen; i++) {
                wsOptions.addRow([
                    natJurOptions[i] || "",
                    tipoEndOptions[i] || "",
                    estadoOptions[i] || ""
                ]);
            }
            
            // Ajusta largura da aba de opções
            wsOptions.columns = [{width: 50}, {width: 40}, {width: 30}];

            // Adiciona Listas Suspensas (Data Validation) nas colunas chave para até 500 linhas
            for (let i = 2; i <= 500; i++) {
                // Coluna G (7) - Natureza Jurídica
                wsTemplate.getCell(`G${i}`).dataValidation = {
                    type: 'list', allowBlank: true, formulae: [`='Códigos e Opções'!$A$2:$A$${natJurOptions.length + 1}`]
                };
                // Coluna Q (17) - Tipo de Endereço
                wsTemplate.getCell(`Q${i}`).dataValidation = {
                    type: 'list', allowBlank: true, formulae: [`='Códigos e Opções'!$B$2:$B$${tipoEndOptions.length + 1}`]
                };
                // Coluna AA (27) - Estado
                wsTemplate.getCell(`AA${i}`).dataValidation = {
                    type: 'list', allowBlank: true, formulae: [`='Códigos e Opções'!$C$2:$C$${estadoOptions.length + 1}`]
                };
            }
            
            // Exporta o arquivo
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "dados_empresa_template.xlsx";
            link.click();
            showToast("Planilha com Listas Suspensas gerada com sucesso!", "success");
        }

        // Modal Logic
        let uploadedRows = [];
        let uploadedFileName = "";

        function showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            let icon = 'info-circle';
            if (type === 'success') icon = 'check-circle';
            if (type === 'error') icon = 'exclamation-circle';
            
            toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        function openModal() { document.getElementById('importModal').classList.add('active'); }
        function closeModal() { document.getElementById('importModal').classList.remove('active'); }
        
        function handleFileSelect(event) {
            if(event.target.files.length > 0) {
                const file = event.target.files[0];
                uploadedFileName = file.name;
                const reader = new FileReader();
                
                if (file.name.endsWith('.csv')) {
                    reader.onload = function(e) {
                        const text = e.target.result;
                        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
                        if (lines.length > 0) {
                            const separator = lines[0].includes(";") ? ";" : ",";
                            uploadedRows = lines.map(line => line.split(separator).map(c => c.replace(/^="|"$/g, '').replace(/^"|"$/g, '').trim()));
                        }
                        showToast(`Arquivo CSV selecionado: ${file.name}. Clique em "Processar Importação".`, 'info');
                    };
                    reader.readAsText(file, "UTF-8"); 
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    reader.onload = function(e) {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, {type: 'array'});
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        
                        // Usamos raw: false para garantir que datas/CNPJs venham formatados como texto
                        const rawRows = XLSX.utils.sheet_to_json(worksheet, {header: 1, raw: false, defval: ""});
                        // Remove empty trailing rows
                        uploadedRows = rawRows.filter(row => row.length > 0 && row.some(cell => String(cell).trim() !== ""));
                        
                        showToast(`Planilha selecionada: ${file.name}. Clique em "Processar Importação".`, 'info');
                    };
                    reader.readAsArrayBuffer(file);
                } else {
                    showToast("Formato não suportado. Por favor, use .xlsx ou .csv", "error");
                }
            }
        }

        function simulateImport() {
            if (uploadedRows.length === 0) {
                showToast("Por favor, selecione um arquivo primeiro.", "error");
                return;
            }

            if (uploadedRows.length <= 1) {
                showToast("O arquivo parece não conter dados de empresas, apenas o cabeçalho (ou está vazio).", "error");
                return;
            }

            const listContainer = document.getElementById("companies-list");

            let count = 0;
            for (let i = 1; i < uploadedRows.length; i++) {
                const cols = uploadedRows[i].map(c => String(c).trim());
                if (cols.length < 5) continue; // Relaxed requirement

                const dataVigenciaEmp = cols[3] || '';
                const razaoSocial = cols[4] || '';
                const nomeInterno = cols[5] || '';
                const apelido = cols[6] || '';
                const cnpjPrefix = cols[7] || '';
                const cidada = cols[8] || '';
                let natJurCodigo = cols[9] || '';
                if (natJurCodigo.includes('-')) natJurCodigo = natJurCodigo.split('-')[0].trim();
                
                const local = cols[11] || '';
                const dataVigenciaLoc = cols[12] || '';
                const apelidoLocal = cols[13] || '';
                const matriz = cols[14] || '';
                const tipoInscrCod = cols[15] || '';
                const cnpjSufix = cols[17] || '';

                const cep = cols[18] || '';
                let tipoEndereco = cols[16] || '';
                if (tipoEndereco.includes('-')) tipoEndereco = tipoEndereco.split('-')[0].trim();
                
                const endereco = cols[21] || '';
                const numero = cols[22] || '';
                const complemento = cols[23] || '';
                const bairro = cols[22] || '';
                const municipio = cols[24] || '';
                const codIBGE = cols[25] || '';
                
                let estado = cols[26] || '';
                if (estado.includes('-')) estado = estado.split('-')[0].trim();

                const cardHTML = `
                <div class="data-card" style="animation: fadeIn 0.5s ease;">
                    <div class="summary-row">
                        <div><div class="col-label">Vigência Empresa</div><div class="col-value">${dataVigenciaEmp}</div></div>
                        <div><div class="col-label">Razão Social</div><div class="col-value">${razaoSocial}</div></div>
                        <div><div class="col-label">CNPJ Prefix</div><div class="col-value">${cnpjPrefix}</div></div>
                        <div><div class="col-label">Local</div><div class="col-value">${local}</div></div>
                        <div class="ga-field" style="display: none; gap: 10px;">
                            <div><div class="col-label" style="color: #059669;">Grupo GA *</div><div class="col-value"><input type="text" class="form-control field-grupo-empresa" style="padding: 0.3rem; height: 32px; width: 90px; font-size: 0.85rem;" placeholder="ID"></div></div>
                            <div><div class="col-label" style="color: #2563eb;" title="Obrigatório apenas para gerar Locais.txt">ID Emp. (Locais)</div><div class="col-value"><input type="text" class="form-control field-id-empresa" style="padding: 0.3rem; height: 32px; width: 90px; font-size: 0.85rem;" placeholder="ID"></div></div>
                        </div>
                        <div><button class="btn btn-outline" onclick="toggleExpand(this)"><i class="fas fa-chevron-down"></i> Editar</button></div>
                    </div>
                    <div class="expanded-content">
                        <div class="empresa-fields">
            <h3 class="section-title"><i class="fas fa-building"></i> Identificação da Empresa</h3>
                        <div class="form-grid">
                <div class="form-group"><label>Continente</label><input type="text" class="form-control field-continente" placeholder="Ex: América"></div>
                <div class="form-group"><label>País</label><input type="text" class="form-control field-pais" placeholder="Ex: Brasil"></div>
                <div class="form-group"><label>Grupo de Empresas</label><input type="text" class="form-control field-grupo-empresa" placeholder="Ex: Grupo Apdata"></div>
                <div class="form-group"><label>Data de Vigência da Empresa</label><input type="text" class="form-control mask-data field-vigencia-emp" value="${dataVigenciaEmp}"></div>
                            <div class="form-group"><label>Razão Social da Empresa</label><input type="text" class="form-control field-razao-social" value="${razaoSocial}"></div>
                            <div class="form-group"><label>Nome Interno</label><input type="text" class="form-control field-nome-interno" value="${nomeInterno}"></div>
                            <div class="form-group"><label>Apelido da Empresa</label><input type="text" class="form-control field-apelido-emp" value="${apelido}"></div>
                            <div class="form-group"><label>Prefixo do CNPJ</label><input type="text" class="form-control mask-cnpj-prefix field-cnpj-prefix" value="${cnpjPrefix}"></div>
                            <div class="form-group"><label>Empresa Cidadã?</label><select class="form-control"><option selected>${cidada}</option><option>Não</option></select></div>
                            <div class="form-group" style="grid-column: span 2;"><label>Natureza Jurídica</label><select class="form-control field-natureza" data-value="${natJurCodigo}">${NAT_JUR_OPTIONS}</select></div>
                        </div>
                        
            </div>
            <div class="locais-container" style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 20px;">
                <div class="local-block" style="padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px dashed #cbd5e1;">
                    <h3 class="section-title"><i class="fas fa-map-marker-alt"></i> Dados do Local</h3>
                        <div class="form-grid">
                            <div class="form-group"><label>Local</label><input type="text" class="form-control field-local" value="${local}"></div>
                            <div class="form-group"><label>Data de Vigência do Local</label><input type="text" class="form-control mask-data field-vigencia-loc" value="${dataVigenciaLoc}"></div>
                            <div class="form-group"><label>Apelido do Local</label><input type="text" class="form-control field-apelido-loc" value="${apelidoLocal}"></div>
                            <div class="form-group"><label>Considerar Matriz?</label><select class="form-control field-matriz"><option selected>${matriz}</option></select></div>
                            <div class="form-group"><label>Tipo de Inscrição</label><select class="form-control field-inscricao">${TIPO_INSCR_OPTIONS}</select></div>
                            <div class="form-group"><label>Sufixo do CNPJ</label><input type="text" class="form-control mask-cnpj-sufix field-cnpj-sufix" value="${cnpjSufix}"></div>
                        </div>
                        <h3 class="section-title"><i class="fas fa-map"></i> Endereço</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label style="display: flex; justify-content: space-between;">CEP <i class="fas fa-circle-notch loading-icon cep-loading" style="display: none;"></i></label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <input type="text" class="form-control mask-cep field-cep" value="${cep}" style="flex: 1;">
                                    <button type="button" class="btn btn-primary" onclick="buscarCep(this)" style="padding: 0.6rem; border-radius: var(--radius-md);" title="Buscar Endereço">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Tipo de Endereço</label>
                                <select class="form-control field-tipo-endereco" data-value="${tipoEndereco}">${TIPO_END_OPTIONS}</select>
                            </div>
                            <div class="form-group" style="grid-column: span 2;"><label>Endereço Base</label><input type="text" class="form-control field-endereco" value="${endereco}"></div>
                            <div class="form-group"><label>Endereço Número</label><input type="text" class="form-control" value="${numero}"></div>
                            <div class="form-group"><label>Endereço Complemento</label><input type="text" class="form-control" value="${complemento}"></div>
                            <div class="form-group" style="grid-column: span 2;"><label>Bairro - Descrição</label><input type="text" class="form-control field-bairro" value="${bairro}"></div>
                            <div class="form-group" style="grid-column: span 2;"><label>Município - Descrição</label><input type="text" class="form-control field-municipio" value="${municipio}"></div>
                            <div class="form-group"><label>Código do Município</label><input type="text" class="form-control" value="${codIBGE}"></div>
                            <div class="form-group">
                                <label>Estado</label>
                                <select class="form-control field-estado" data-value="${estado}">
                                    <option value="1">1 - Acre</option>
                                    <option value="2">2 - Alagoas</option>
                                    <option value="3">3 - Amazonas</option>
                                    <option value="4">4 - Amapá</option>
                                    <option value="5">5 - Bahia</option>
                                    <option value="6">6 - Ceará</option>
                                    <option value="7">7 - Distrito Federal</option>
                                    <option value="8">8 - Espírito Santo</option>
                                    <option value="9">9 - Goiás</option>
                                    <option value="10">10 - Maranhão</option>
                                    <option value="11">11 - Minas Gerais</option>
                                    <option value="12">12 - Mato Grosso do Sul</option>
                                    <option value="13">13 - Mato Grosso</option>
                                    <option value="14">14 - Pará</option>
                                    <option value="15">15 - Paraíba</option>
                                    <option value="16">16 - Pernambuco</option>
                                    <option value="17">17 - Piauí</option>
                                    <option value="18">18 - Paraná</option>
                                    <option value="19">19 - Rio de Janeiro</option>
                                    <option value="20">20 - Rio Grande do Norte</option>
                                    <option value="21">21 - Rondônia</option>
                                    <option value="22">22 - Roraima</option>
                                    <option value="23">23 - Rio Grande do Sul</option>
                                    <option value="24">24 - Santa Catarina</option>
                                    <option value="25">25 - Sergipe</option>
                                    <option value="26">26 - São Paulo</option>
                                    <option value="27">27 - Tocantins</option>
                                </select>
                            </div>
                        </div>
                               </div> <!-- end of local-block -->
            </div> <!-- end of locais-container -->
            <button type="button" class="btn btn-primary" style="margin-top: 15px; width: 100%;" onclick="addNewLocalBlock(this)"><i class="fas fa-plus"></i> Adicionar Outro Local a esta Empresa</button>
            <button class="btn btn-outline" style="color: var(--danger); border-color: var(--danger); margin-top: 1rem;" onclick="this.closest('.data-card').remove(); saveEmpresasState();">Remover Registro</button>
                    </div>
                </div>`;
                listContainer.insertAdjacentHTML('beforeend', cardHTML);
                
                // Select the correct options based on the CSV code
                const lastCard = listContainer.lastElementChild;
                const selects = lastCard.querySelectorAll('select[data-value]');
                selects.forEach(select => {
                    const code = select.getAttribute('data-value');
                    if (code) {
                        select.value = code; 
                    }
                });
                
                count++;
            }

            showToast(`Importação concluída! ${count} registros foram processados com sucesso.`, "success");
            applyMasks(); // Reaplica as máscaras nos novos inputs gerados dinamicamente
            closeModal();
            saveEmpresasState();
        }

        // --- MASK LOGIC ---
        function applyMasks() {
            document.querySelectorAll('.mask-data').forEach(el => {
                if(el.dataset.masked) return; el.dataset.masked = "true";
                el.setAttribute('maxlength', '10');
                el.addEventListener('input', function(e) {
                    let v = e.target.value.replace(/\D/g, '').substring(0, 8);
                    if (v.length > 4) v = v.substring(0,2) + '/' + v.substring(2,4) + '/' + v.substring(4);
                    else if (v.length > 2) v = v.substring(0,2) + '/' + v.substring(2);
                    e.target.value = v;
                });
                if(el.value) el.dispatchEvent(new Event('input')); // trigger on load
            });

            document.querySelectorAll('.mask-cnpj-prefix').forEach(el => {
                if(el.dataset.masked) return; el.dataset.masked = "true";
                el.setAttribute('maxlength', '10');
                el.addEventListener('input', function(e) {
                    let v = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 8);
                    if (v.length > 5) v = v.substring(0,2) + '.' + v.substring(2,5) + '.' + v.substring(5);
                    else if (v.length > 2) v = v.substring(0,2) + '.' + v.substring(2);
                    e.target.value = v;
                });
                if(el.value) el.dispatchEvent(new Event('input')); // trigger on load
            });

            document.querySelectorAll('.mask-cnpj-sufix').forEach(el => {
                if(el.dataset.masked) return; el.dataset.masked = "true";
                el.setAttribute('maxlength', '7');
                el.addEventListener('input', function(e) {
                    let v = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 6);
                    if (v.length > 4) v = v.substring(0,4) + '-' + v.substring(4);
                    e.target.value = v;
                });
                if(el.value) el.dispatchEvent(new Event('input')); // trigger on load
            });

            document.querySelectorAll('.mask-cep').forEach(el => {
                if(el.dataset.masked) return; el.dataset.masked = "true";
                el.setAttribute('maxlength', '9');
                el.addEventListener('input', function(e) {
                    let v = e.target.value.replace(/\D/g, '').substring(0, 8);
                    if (v.length > 5) v = v.substring(0,5) + '-' + v.substring(5);
                    e.target.value = v;
                });
                
                // Fetch CEP on blur
                el.addEventListener('blur', function() {
                    if (this.value.replace(/\D/g, '').length === 8) {
                        const btn = this.parentElement.querySelector('button');
                        if (btn) buscarCep(btn);
                    }
                });
                
                if(el.value) el.dispatchEvent(new Event('input')); // trigger on load
            });
        }
        applyMasks();

        // --- VIACEP INTEGRATION ---
        function buscarCep(btnElement) {
            const card = btnElement.closest('.local-block') || btnElement.closest('.data-card');
            const cepInput = card.querySelector('.field-cep');
            const cepLoading = card.querySelector('.cep-loading');
            const cep = cepInput.value.replace(/\D/g, '');
            
            if (cep.length === 8) {
                if(cepLoading) cepLoading.style.display = 'inline-block';
                fetch(`https://viacep.com.br/ws/${cep}/json/`)
                    .then(response => response.json())
                    .then(data => {
                        if(cepLoading) cepLoading.style.display = 'none';
                        if (!data.erro) {
                            const end = card.querySelector('.field-endereco');
                            const bai = card.querySelector('.field-bairro');
                            const mun = card.querySelector('.field-municipio');
                            
                            if(end) {
                                let logradouro = data.logradouro;
                                const parts = logradouro.split(' ');
                                const primeiraPalavra = parts[0].toLowerCase();
                                
                                const selectTipo = card.querySelector('.field-tipo-endereco');
                                if (selectTipo) {
                                    let matchFound = false;
                                    Array.from(selectTipo.options).forEach(opt => {
                                        // A opção tem o formato "6 - Rua", então pegamos a parte após o hífen
                                        const partesTexto = opt.text.split(' - ');
                                        if (partesTexto.length > 1) {
                                            const descricao = partesTexto[1].toLowerCase().trim();
                                            // Se for igual, ou se o ViaCEP retornar "Av." e a opção for "Avenida" (vamos tratar direto ou com startswith)
                                            // ViaCEP costuma retornar por extenso "Rua", "Avenida", "Travessa"
                                            if (descricao === primeiraPalavra || (primeiraPalavra === 'av' && descricao === 'avenida') || (primeiraPalavra === 'av.' && descricao === 'avenida')) {
                                                selectTipo.value = opt.value;
                                                matchFound = true;
                                            }
                                        }
                                    });
                                    if (matchFound) {
                                        // Remove o tipo de endereço do começo da string base
                                        logradouro = parts.slice(1).join(' ').trim();
                                    }
                                }
                                end.value = logradouro;
                            }
                            
                            if(bai) bai.value = data.bairro;
                            if(mun) mun.value = data.localidade;
                            // Na busca de CEP, não podemos mapear 'UF' (SP) para o código 26 diretamente,
                            // a menos que façamos um de/para. Como é um protótipo, deixamos manual ou via IBGE.
                            showToast('Endereço preenchido com sucesso!', 'success');
                        } else {
                            showToast('CEP não encontrado nos Correios!', 'error');
                        }
                    })
                    .catch(err => {
                        if(cepLoading) cepLoading.style.display = 'none';
                        showToast('Erro ao buscar CEP', 'error');
                        console.error('Erro ao buscar CEP:', err);
                    });
            } else {
                showToast('Digite um CEP válido completo antes de buscar.', 'error');
            }
        }

        // Feature: Exportação GA
        let exportMode = false;
        
        function parseDateForGA(d) {
            if (!d) return "";
            const parts = d.split('/');
            if (parts.length === 3) return parts[2] + parts[1] + parts[0];
            return d.replace(/\D/g, ''); // Fallback
        }

        async function exportGA() {
            const fields = document.querySelectorAll('.ga-field');
            if (fields.length === 0) {
                showToast("Nenhuma empresa na tela para exportar.", "error");
                return;
            }

            if (!exportMode) {
                // Modo 1: Mostrar campos de Grupo de Empresa
                fields.forEach(f => {
                    f.style.display = 'flex';
                    f.style.animation = 'fadeIn 0.5s ease';
                });
                exportMode = true;
                const btn = document.getElementById('btnExportGA');
                btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Exportação GA';
                showToast("Preencha o 'Grupo GA' e clique em Confirmar Exportação. O ID Empresa só é obrigatório para gerar Locais.txt.", "info");
                return;
            }
            
            // Modo 2: Validar e Exportar
            const cards = document.querySelectorAll('.data-card');
            let hasError = false;
            let hasErrorIdEmp = false;
            
            let empresasTxt = '#KEY#{9DFEBC36-XXX-4F56-XXXX}[Gere sua chave no Aptools no item "Chave para importa" em "Ferramentas"]\r\n';
            let locaisTxt = '#KEY#{9DFEBC36-XXX-4F56-XXXX}[Gere sua chave no Aptools no item "Chave para importa" em "Ferramentas"]\r\n';
            
            cards.forEach(card => {
                const allInputs = card.querySelectorAll('input.form-control, select.form-control');
                allInputs.forEach(input => {
                    // Skip id-empresa (validated separately for Locais) and complemento (optional)
                    if (input.classList.contains('field-id-empresa') || input.classList.contains('field-complemento')) return;
                    
                    if (!input.value.trim()) {
                        hasError = true;
                        input.style.borderColor = 'red';
                    } else {
                        input.style.borderColor = 'var(--border-color)';
                    }
                });
                
                const idEmpInput = card.querySelector('.field-id-empresa');
                if (!idEmpInput || !idEmpInput.value.trim()) {
                    hasErrorIdEmp = true;
                    if(idEmpInput) idEmpInput.style.borderColor = 'var(--border-color)'; // Reseta caso estivesse vermelho
                } else {
                    if(idEmpInput) idEmpInput.style.borderColor = 'var(--border-color)';
                }
                
                if (hasError) return;
                
                // Empresas
                const grupoInput = card.querySelector('.field-grupo-empresa');
                const grupo = grupoInput ? grupoInput.value.trim() : '';
                const idEmpresa = idEmpInput ? idEmpInput.value.trim() : '';
                const dtVigEmp = parseDateForGA(card.querySelector('.field-vigencia-emp')?.value || '');
                const razao = card.querySelector('.field-razao-social')?.value || '';
                const nomeInt = card.querySelector('.field-nome-interno')?.value || '';
                const apelidoEmp = card.querySelector('.field-apelido-emp')?.value || '';
                const pCnpj = card.querySelector('.field-cnpj-prefix')?.value || '';
                
                const natSel = card.querySelector('.field-natureza');
                let natId = natSel ? natSel.value : '';
                if(natId.includes('-')) natId = natId.split('-')[0].trim();
                
                empresasTxt += `15052;3240;(${grupo})128306;(${dtVigEmp})3190;(${razao})40430;(${nomeInt})3200;(${apelidoEmp})3245;(${pCnpj})54373;(${natId})\r\n`;
                
                // Locais
                const local = card.querySelector('.field-local')?.value || '';
                const dtVigLoc = parseDateForGA(card.querySelector('.field-vigencia-loc')?.value || '');
                const apLoc = card.querySelector('.field-apelido-loc')?.value || '';
                
                const matrizSel = card.querySelector('.field-matriz');
                const isMatriz = (matrizSel && matrizSel.value.toLowerCase() === 'sim') ? '1' : '0';
                
                const inscSel = card.querySelector('.field-inscricao');
                let inscId = inscSel ? inscSel.value : '';
                if(inscId.includes('-')) inscId = inscId.split('-')[0].trim();
                
                const sufCnpj = card.querySelector('.field-cnpj-sufix')?.value || '';
                const cep = card.querySelector('.field-cep')?.value || '';
                
                const tipoEndSel = card.querySelector('.field-tipo-endereco');
                let tipoEndId = tipoEndSel ? tipoEndSel.value : '';
                if(tipoEndId.includes('-')) tipoEndId = tipoEndId.split('-')[0].trim();
                
                const endBase = card.querySelector('.field-endereco')?.value || '';
                const num = card.querySelector('.field-numero')?.value || '';
                const compl = card.querySelector('.field-complemento')?.value || '';
                const bairro = card.querySelector('.field-bairro')?.value || '';
                const mun = card.querySelector('.field-municipio')?.value || '';
                
                const estSel = card.querySelector('.field-estado');
                let estId = estSel ? estSel.value : '';
                if(estId.includes('-')) estId = estId.split('-')[0].trim();
                
                locaisTxt += `15062;3260;(${idEmpresa})3280;(${local})129805;(${dtVigLoc})49073;(${apLoc})3490;(${isMatriz})3485;(${inscId})3420;(${sufCnpj})3360;(${cep})3300;(${tipoEndId})3304;(${endBase})3308;(${num})3309;(${compl})3310;(${bairro})3330;(${mun})3370;(${estId})\r\n`;
            });
            
            if (hasError) {
                showToast("Preencha todos os campos obrigatórios destacados em vermelho.", "error");
                return;
            }
            
            try {
                // Prepara os links de download diretos para evitar bloqueio de pop-up do navegador
                const blobEmp = new Blob([empresasTxt], { type: 'text/plain;charset=utf-8' });
                const blobLoc = new Blob([locaisTxt], { type: 'text/plain;charset=utf-8' });
                
                const urlEmp = URL.createObjectURL(blobEmp);
                const urlLoc = URL.createObjectURL(blobLoc);
                
                const btnGroup = document.querySelector('.header-actions');
                
                // Salva os botões originais
                if (!window.originalBtnGroup) {
                    window.originalBtnGroup = btnGroup.innerHTML;
                }
                
                // Substitui pelos botões de download e botão concluir
                btnGroup.innerHTML = `
                    <a href="${urlEmp}" download="Empresas.txt" class="btn btn-primary" style="background-color: #059669; border-color: #059669; text-decoration: none;">
                        <i class="fas fa-download"></i> Baixar Empresas.txt
                    </a>
                    ${hasErrorIdEmp ? `
                    <button class="btn btn-outline" style="cursor: not-allowed; opacity: 0.6;" title="Preencha todos os campos 'ID Empresa' se quiser liberar este download." onclick="showToast('Para gerar o Locais.txt, você precisa preencher o ID Empresa nos cartões.', 'error')">
                        <i class="fas fa-lock"></i> Baixar Locais.txt
                    </button>
                    ` : `
                    <a href="${urlLoc}" download="Locais.txt" class="btn btn-primary" style="background-color: #059669; border-color: #059669; text-decoration: none;">
                        <i class="fas fa-download"></i> Baixar Locais.txt
                    </a>
                    `}
                    <button class="btn btn-outline" onclick="resetExportGA()">
                        <i class="fas fa-check"></i> Concluir
                    </button>
                `;
                
                showToast("Dados processados! Você já pode baixar os arquivos gerados.", "success");
                
                // Esconde os campos de edição
                fields.forEach(f => f.style.display = 'none');
                
            } catch (err) {
                console.error(err);
                showToast("Erro ao processar os arquivos.", "error");
            }
        }
        
        function resetExportGA() {
            exportMode = false;
            const btnGroup = document.querySelector('.header-actions');
            if (window.originalBtnGroup) {
                btnGroup.innerHTML = window.originalBtnGroup;
            }
        }
    
window.validateEmpresasForFinalization = function() {
    const cards = document.querySelectorAll('.data-card');
    if (cards.length === 0) return false;
    let isValid = true;
    cards.forEach(card => {
        const allInputs = card.querySelectorAll('input.form-control, select.form-control');
        allInputs.forEach(input => {
            if (input.classList.contains('field-id-empresa') || input.classList.contains('field-complemento')) return;
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = 'red';
            } else {
                input.style.borderColor = 'var(--border-color)';
            }
        });
    });
    return isValid;
};

window.applyLockToEmpresas = function() {
    if (typeof isCurrentClientLocked !== 'undefined' && isCurrentClientLocked && typeof currentUser !== 'undefined' && currentUser.role === 'client') {
        const cards = document.querySelectorAll('.data-card');
        cards.forEach(card => {
            card.querySelectorAll('input, select, button').forEach(el => {
                if (!el.closest('.summary-row')) {
                    el.disabled = true;
                    el.style.backgroundColor = '#f3f4f6';
                }
            });
            const removeBtn = card.querySelector('button[onclick*="remove()"]');
            if (removeBtn) removeBtn.style.display = 'none';
        });
        
        const addBtn = document.querySelector('button[onclick*="addEmpresa"]');
        if (addBtn) addBtn.style.display = 'none';
        
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) headerActions.style.display = 'none';
    }
};

function saveEmpresasState() {
    const cards = document.querySelectorAll('.data-card');
    const newState = [];
    cards.forEach(card => {
        const empInputs = card.querySelector('.empresa-fields') ? card.querySelector('.empresa-fields').querySelectorAll('input, select') : [];
        const empObj = {};
        empInputs.forEach(input => {
            const cls = Array.from(input.classList).find(c => c.startsWith('field-'));
            if(cls) empObj[cls] = input.value;
        });
        
        const localBlocks = card.querySelectorAll('.local-block');
        if (localBlocks.length > 0) {
            localBlocks.forEach(block => {
                const locObj = { ...empObj };
                const locInputs = block.querySelectorAll('input, select');
                locInputs.forEach(input => {
                    const cls = Array.from(input.classList).find(c => c.startsWith('field-'));
                    if(cls) locObj[cls] = input.value;
                });
                newState.push(locObj);
            });
        } else {
            // Fallback for empty card
            newState.push(empObj);
        }
    });
    window.empresas.splice(0, window.empresas.length, ...newState);
    if(typeof saveDraft === "function") { saveDraft(); }
}

function addNewLocalBlock(btn) {
    const card = btn.closest('.data-card');
    const container = card.querySelector('.locais-container');
    const firstBlock = container.querySelector('.local-block');
    if (!firstBlock) return;
    
    const newBlock = firstBlock.cloneNode(true);
    // Clear values in the new block
    const inputs = newBlock.querySelectorAll('input, select');
    inputs.forEach(input => {
        if(input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        } else {
            input.value = '';
        }
    });
    
    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '<i class="fas fa-trash"></i> Remover Local';
    removeBtn.className = "btn btn-outline";
    removeBtn.style.cssText = "color: #ef4444; border-color: #ef4444; margin-top: 10px;";
    removeBtn.onclick = function() { newBlock.remove(); saveEmpresasState(); };
    newBlock.appendChild(removeBtn);
    
    container.appendChild(newBlock);
    
    // Rebind masks if any
    if (typeof applyMasks === 'function') applyMasks();
}

function addEmpresa(isRendering = false) {
    const listContainer = document.getElementById("companies-list");
    const cardHTML = `
    <div class="data-card" style="animation: fadeIn 0.5s ease;">
        <div class="summary-row">
            <div><div class="col-label">Vigência Empresa</div><div class="col-value"></div></div>
            <div><div class="col-label">Razão Social</div><div class="col-value">Nova Empresa</div></div>
            <div><div class="col-label">CNPJ Prefix</div><div class="col-value"></div></div>
            <div><div class="col-label">Local</div><div class="col-value"></div></div>
            <div class="ga-field" style="display: none; gap: 10px;">
                <div><div class="col-label" style="color: #059669;">Grupo GA *</div><div class="col-value"><input type="text" class="form-control field-grupo-empresa" style="padding: 0.3rem; height: 32px; width: 90px; font-size: 0.85rem;" placeholder="ID"></div></div>
                <div><div class="col-label" style="color: #2563eb;" title="Obrigatório apenas para gerar Locais.txt">ID Emp. (Locais)</div><div class="col-value"><input type="text" class="form-control field-id-empresa" style="padding: 0.3rem; height: 32px; width: 90px; font-size: 0.85rem;" placeholder="ID"></div></div>
            </div>
            <div><button class="btn btn-outline" onclick="toggleExpand(this)"><i class="fas fa-chevron-down"></i> Editar</button></div>
        </div>
        <div class="expanded-content active">
            <div class="empresa-fields">
            <h3 class="section-title"><i class="fas fa-building"></i> Identificação da Empresa</h3>
            <div class="form-grid">
                <div class="form-group"><label>Continente</label><input type="text" class="form-control field-continente" placeholder="Ex: América"></div>
                <div class="form-group"><label>País</label><input type="text" class="form-control field-pais" placeholder="Ex: Brasil"></div>
                <div class="form-group"><label>Grupo de Empresas</label><input type="text" class="form-control field-grupo-empresa" placeholder="Ex: Grupo Apdata"></div>
                <div class="form-group"><label>Data de Vigência da Empresa</label><input type="text" class="form-control mask-data field-vigencia-emp"></div>
                <div class="form-group"><label>Razão Social da Empresa</label><input type="text" class="form-control field-razao-social" oninput="this.closest('.data-card').querySelector('.summary-row > div:nth-child(2) .col-value').innerText = this.value;"></div>
                <div class="form-group"><label>Nome Interno</label><input type="text" class="form-control field-nome-interno"></div>
                <div class="form-group"><label>Apelido da Empresa</label><input type="text" class="form-control field-apelido-emp"></div>
                <div class="form-group"><label>Prefixo do CNPJ</label><input type="text" class="form-control mask-cnpj-prefix field-cnpj-prefix"></div>
                <div class="form-group"><label>Empresa Cidadã?</label><select class="form-control field-cidada"><option>Não</option><option>Sim</option></select></div>
                <div class="form-group" style="grid-column: span 2;"><label>Natureza Jurídica</label><select class="form-control field-natureza">${NAT_JUR_OPTIONS}</select></div>
            </div>
            
            </div>
            <div class="locais-container" style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 20px;">
                <div class="local-block" style="padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px dashed #cbd5e1;">
                    <h3 class="section-title"><i class="fas fa-map-marker-alt"></i> Dados do Local</h3>
            <div class="form-grid">
                <div class="form-group"><label>Local</label><input type="text" class="form-control field-local" oninput="this.closest('.data-card').querySelector('.summary-row > div:nth-child(4) .col-value').innerText = this.value;"></div>
                <div class="form-group"><label>Data de Vigência do Local</label><input type="text" class="form-control mask-data field-vigencia-loc"></div>
                <div class="form-group"><label>Apelido do Local</label><input type="text" class="form-control field-apelido-loc"></div>
                <div class="form-group"><label>Considerar Matriz?</label><select class="form-control field-matriz"><option>Não</option><option>Sim</option></select></div>
                <div class="form-group"><label>Tipo de Inscrição</label><select class="form-control field-inscricao">${TIPO_INSCR_OPTIONS}</select></div>
                <div class="form-group"><label>Sufixo do CNPJ</label><input type="text" class="form-control mask-cnpj-sufix field-cnpj-sufix"></div>
            </div>
            <h3 class="section-title"><i class="fas fa-map"></i> Endereço</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label style="display: flex; justify-content: space-between;">CEP <i class="fas fa-circle-notch loading-icon cep-loading" style="display: none;"></i></label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" class="form-control mask-cep field-cep" style="flex: 1;">
                        <button type="button" class="btn btn-primary" onclick="buscarCep(this)" style="padding: 0.6rem; border-radius: var(--radius-md);" title="Buscar Endereço">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label>Tipo de Endereço</label>
                    <select class="form-control field-tipo-endereco">${TIPO_END_OPTIONS}</select>
                </div>
                <div class="form-group" style="grid-column: span 2;"><label>Endereço Base</label><input type="text" class="form-control field-endereco"></div>
                <div class="form-group"><label>Endereço Número</label><input type="text" class="form-control field-numero"></div>
                <div class="form-group"><label>Endereço Complemento</label><input type="text" class="form-control field-complemento"></div>
                <div class="form-group" style="grid-column: span 2;"><label>Bairro - Descrição</label><input type="text" class="form-control field-bairro"></div>
                <div class="form-group" style="grid-column: span 2;"><label>Município - Descrição</label><input type="text" class="form-control field-municipio"></div>
                <div class="form-group"><label>Código do Município</label><input type="text" class="form-control field-codibge"></div>
                <div class="form-group">
                    <label>Estado</label>
                    <select class="form-control field-estado">${ESTADO_OPTIONS}</select>
                </div>
            </div>
                   </div> <!-- end of local-block -->
            </div> <!-- end of locais-container -->
            <button type="button" class="btn btn-primary" style="margin-top: 15px; width: 100%;" onclick="addNewLocalBlock(this)"><i class="fas fa-plus"></i> Adicionar Outro Local a esta Empresa</button>
            <button class="btn btn-outline" style="color: var(--danger); border-color: var(--danger); margin-top: 1rem;" onclick="this.closest('.data-card').remove(); saveEmpresasState();">Remover Registro</button>
        </div>
    </div>`;
    listContainer.insertAdjacentHTML('beforeend', cardHTML);
    applyMasks();
    
    // Add event listeners to input changes to save state
    const newCard = listContainer.lastElementChild;
    newCard.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('change', saveEmpresasState);
        el.addEventListener('blur', saveEmpresasState);
    });
    
    if (!isRendering) {
        saveEmpresasState();
    }
}

document.addEventListener('change', function(e) {
    if(e.target.matches('.data-card input, .data-card select')) {
        saveEmpresasState();
    }
});

function renderEmpresasFromState() {
    const data = [...(window.empresas || [])];
    const listContainer = document.getElementById("companies-list");
    listContainer.innerHTML = '';
    
    if (data.length === 0) {
        return;
    }
    
    // Simplification: We will just call addEmpresa and fill fields
    data.forEach(empresa => {
        addEmpresa(true);
        const card = listContainer.lastElementChild;
        // set values
        Object.keys(empresa).forEach(cls => {
            if (!cls.startsWith('field-')) return;
            try {
                const field = card.querySelector('.' + cls);
                if(field) {
                    field.value = empresa[cls];
                    // trigger change
                    if(field.dataset && field.dataset.masked) {
                        field.dispatchEvent(new Event('input'));
                    }
                    
                    // update summary
                    if(cls === 'field-razao-social') card.querySelector('.summary-row > div:nth-child(2) .col-value').innerText = empresa[cls];
                    if(cls === 'field-vigencia-emp') card.querySelector('.summary-row > div:nth-child(1) .col-value').innerText = empresa[cls];
                    if(cls === 'field-cnpj-prefix') card.querySelector('.summary-row > div:nth-child(3) .col-value').innerText = empresa[cls];
                    if(cls === 'field-local') card.querySelector('.summary-row > div:nth-child(4) .col-value').innerText = empresa[cls];
                }
            } catch(e) {
                console.warn("Invalid selector class:", cls);
            }
        });
        
        // Retract by default
        const btn = card.querySelector('.summary-row .btn-outline');
        if(btn) {
            btn.innerHTML = '<i class="fas fa-chevron-down"></i> Editar';
            const content = card.querySelector('.expanded-content');
            if(content) content.classList.remove('active');
        }
    });
    
    if (typeof window.applyLockToEmpresas === "function") {
        window.applyLockToEmpresas();
    }
    
    // Hide GA fields if client
    if (window.currentUser && window.currentUser.role === 'cliente') {
        const gaFields = document.querySelectorAll('.ga-field');
        gaFields.forEach(f => f.style.display = 'none');
    }
}