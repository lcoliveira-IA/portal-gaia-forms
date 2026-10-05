// ============================================================================
// ROTINA 1215 ENGINE - CLIENT-SIDE JAVASCRIPT (PORTAL GAIA ESTÁTICO)
// ============================================================================
// Confronta respostas do formulário web com dados atuais do Global Antares (CSV do consultor)
// e gera o arquivo de importação da Rotina 1215 e relatório de auditoria 100% no navegador.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.Rotina1215Engine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const COLUNAS_ESPERADAS_CSV = [
        "REGRA_TXT", "ID_CAMPO_CHAVE", "ID_TRANSACAO_1215", "ITEM_TXT", "VALOR_ESPERADO_TXT",
        "NOME_ENTIDADE", "VALOR_ATUAL_BANCO", "ID_ENTIDADE", "NIVEL", "LITERAL_CAMPO",
        "NOME_FISICO_CAMPO", "ID_CAMPO_ALVO"
    ];

    let cacheRegras = null;
    let cachePerguntas = null;
    let cacheMapaChaves = null;
    let cacheDicionario = null;

    async function carregarJSON(url) {
        if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
            const res = await fetch(url + "?v=" + Date.now());
            if (!res.ok) throw new Error("Não foi possível carregar " + url);
            return await res.json();
        } else {
            // Ambiente Node.js (testes locais)
            const fs = require('fs');
            const path = require('path');
            const cleanPath = url.split('?')[0];
            const fullPath = path.resolve(__dirname, cleanPath);
            return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        }
    }

    async function init() {
        if (!cacheRegras) {
            try {
                cacheRegras = await carregarJSON('./inteligencia/Inteligencia_Rotina_1215_Mapeamento.json');
            } catch (e) {
                console.warn("[1215 Engine] Falha ao carregar regras:", e);
                cacheRegras = { regras: [] };
            }
        }
        if (!cachePerguntas) {
            try {
                cachePerguntas = await carregarJSON('./inteligencia/Formulario_Perguntas_COMPLETO.json');
            } catch (e) {
                console.warn("[1215 Engine] Falha ao carregar perguntas:", e);
                cachePerguntas = { perguntas: [] };
            }
        }
        if (!cacheMapaChaves) {
            try {
                cacheMapaChaves = await carregarJSON('./inteligencia/Mapa_Chaves_Padronizadas.json');
            } catch (e) {
                console.warn("[1215 Engine] Falha ao carregar mapa de chaves:", e);
                cacheMapaChaves = {};
            }
        }
        if (!cacheDicionario) {
            try {
                cacheDicionario = await carregarJSON('./inteligencia/Dicionario_Campos_1215.json');
            } catch (e) {
                cacheDicionario = { campos: [] };
            }
        }
        return true;
    }

    function initWithStrings(regrasStr, perguntasStr, mapaStr, dicionarioStr) {
        try { cacheRegras = typeof regrasStr === 'string' ? JSON.parse(regrasStr) : regrasStr; } catch(e) { cacheRegras = { regras: [] }; }
        try { cachePerguntas = typeof perguntasStr === 'string' ? JSON.parse(perguntasStr) : perguntasStr; } catch(e) { cachePerguntas = { perguntas: [] }; }
        try { cacheMapaChaves = typeof mapaStr === 'string' ? JSON.parse(mapaStr) : mapaStr; } catch(e) { cacheMapaChaves = {}; }
        try { cacheDicionario = typeof dicionarioStr === 'string' ? JSON.parse(dicionarioStr) : dicionarioStr; } catch(e) { cacheDicionario = { campos: [] }; }
        return true;
    }

    function parseCsvGA(conteudo) {
        if (!conteudo || typeof conteudo !== 'string') return [];

        const linhas = conteudo.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (linhas.length === 0) return [];

        const primeiraLinha = linhas[0].split('|').map(c => c.trim().toUpperCase());
        let temCabecalho = false;
        let colunas = COLUNAS_ESPERADAS_CSV;

        if (primeiraLinha.includes("ID_CAMPO_ALVO") || primeiraLinha.includes("REGRA_TXT")) {
            temCabecalho = true;
            colunas = primeiraLinha;
        }

        const linhasDados = temCabecalho ? linhas.slice(1) : linhas;
        const registros = [];

        for (let i = 0; i < linhasDados.length; i++) {
            const partes = linhasDados[i].split('|').map(p => p.trim());
            if (partes.length < 5) continue;

            const item = {};
            for (let c = 0; c < colunas.length; c++) {
                const colName = colunas[c];
                let val = c < partes.length ? partes[c] : "";
                if (val.toUpperCase() === "NULL" || val.toUpperCase() === "NONE" || val.toUpperCase() === "NAN") {
                    val = "";
                }
                item[colName] = val;
            }
            registros.push(item);
        }
        return registros;
    }

    function normalizarValor(val) {
        if (val === null || val === undefined) return "";
        let s = String(val).trim();
        const upper = s.toUpperCase();
        if (upper === "NULL" || upper === "NONE" || upper === "NAN" || upper === "VAZIO") return "";
        const lower = s.toLowerCase();
        if (lower === "true" || lower === "sim" || lower === "s") return "1";
        if (lower === "false" || lower === "nao" || lower === "não" || lower === "n") return "0";
        return s;
    }

    function extrairNumeroDeTexto(txt) {
        if (!txt) return null;
        const m = String(txt).match(/\d+/);
        return m ? parseInt(m[0], 10) : null;
    }

    function formatarCpf(cpfRaw) {
        if (!cpfRaw) return "";
        const digits = String(cpfRaw).replace(/\D/g, "");
        if (digits.length === 11) {
            return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
        }
        return String(cpfRaw).trim();
    }

    function extrairDadosResponsavel(respVal) {
        let nome = "";
        let cpf = "";
        let email = "";

        if (typeof respVal === 'object' && respVal !== null) {
            nome = String(respVal.nome || "").trim();
            cpf = String(respVal.cpf || "").trim();
            email = String(respVal.email || "").trim();
            if (!nome && !cpf && respVal.texto_completo) {
                return extrairDadosResponsavel(respVal.texto_completo);
            }
            if (!nome && !cpf && respVal.resposta) {
                return extrairDadosResponsavel(respVal.resposta);
            }
        } else if (typeof respVal === 'string') {
            const partes = respVal.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
            for (let i = 0; i < partes.length; i++) {
                const p = partes[i];
                if (p.includes("@") && !email) {
                    email = p;
                } else if (/\d{3}/.test(p) && !cpf) {
                    const digits = p.replace(/\D/g, "");
                    if (digits.length === 11 || /\d{3}[\.\s-]?\d{3}[\.\s-]?\d{3}[\.\s-]?\d{2}/.test(p)) {
                        cpf = formatarCpf(p);
                    } else {
                        cpf = p;
                    }
                } else if (!nome) {
                    nome = p;
                }
            }
        }

        if (cpf) cpf = formatarCpf(cpf);
        return { nome, cpf, email };
    }

    function padronizarChaveResposta(chaveOuRotulo, pergunta, itemTxt, idCampoAlvo, mapaChavesJson) {
        if (!chaveOuRotulo) return "";
        const s = String(chaveOuRotulo).trim();
        const sLower = s.toLowerCase();

        if (mapaChavesJson && mapaChavesJson.ajustes) {
            for (const aj of mapaChavesJson.ajustes) {
                const matchItem = !itemTxt || aj.item_txt === itemTxt;
                const matchCampo = !idCampoAlvo || String(aj.id_campo_alvo) === String(idCampoAlvo);
                if (matchItem && matchCampo) {
                    const mapaAntigo = aj.mapa_antigo_para_novo || {};
                    for (const [ant, novo] of Object.entries(mapaAntigo)) {
                        if (ant.toLowerCase() === sLower || ant.toLowerCase().includes(sLower) || sLower.includes(ant.toLowerCase())) {
                            return novo;
                        }
                    }
                }
            }
        }

        if (pergunta && pergunta.opcoes) {
            for (const opt of pergunta.opcoes) {
                if ((opt.chave || "").toLowerCase() === sLower) return opt.chave;
                const rotulo = (opt.rotulo || "").toLowerCase();
                if (sLower === rotulo || sLower.includes(rotulo) || rotulo.includes(sLower)) {
                    return opt.chave;
                }
            }
        }

        if (sLower.includes("competência") || sLower.includes("competencia")) return "comercial";
        if (sLower.includes("caixa")) return "calendario";
        if (sLower === "sim" || sLower === "s") return "sim";
        if (sLower === "nao" || sLower === "não" || sLower === "n") return "nao";

        return s;
    }

    function resolverValorEsperado(campo, respostaObj, pergunta, itemTxt, dataCorrente, mapaChaves) {
        if (!dataCorrente) dataCorrente = new Date();

        if (campo.valor_fixo !== undefined && campo.valor_fixo !== null) {
            return [String(campo.valor_fixo).trim(), false];
        }

        const idAlvoStr = String(campo.id_campo_alvo || "").trim();
        if (["39110", "4153", "3380"].includes(idAlvoStr)) {
            const dados = extrairDadosResponsavel(respostaObj);
            if (dados.nome) return [dados.nome, false];
            if (typeof respostaObj === 'object' && respostaObj !== null && respostaObj.valor_especificado) {
                return [String(respostaObj.valor_especificado).trim(), false];
            }
            if (typeof respostaObj === 'string' && respostaObj.trim() && !["outro", "outros", "texto"].includes(respostaObj.trim().toLowerCase())) {
                return [respostaObj.trim(), false];
            }
            return [null, true];
        }

        if (["39105", "4151", "122710"].includes(idAlvoStr)) {
            const dados = extrairDadosResponsavel(respostaObj);
            if (dados.cpf) return [dados.cpf, false];
            if (typeof respostaObj === 'object' && respostaObj !== null && respostaObj.valor_especificado) {
                return [formatarCpf(respostaObj.valor_especificado), false];
            }
            if (typeof respostaObj === 'string' && respostaObj.trim() && !["outro", "outros", "texto"].includes(respostaObj.trim().toLowerCase())) {
                return [formatarCpf(respostaObj.trim()), false];
            }
            return [null, true];
        }

        let chaveResposta = "";
        let valorEspecificado = "";
        if (typeof respostaObj === 'object' && respostaObj !== null && !Array.isArray(respostaObj)) {
            chaveResposta = String(respostaObj.resposta || "").trim();
            valorEspecificado = String(respostaObj.valor_especificado || "").trim();
            if (!chaveResposta && typeof respostaObj.campo === 'object') {
                chaveResposta = "texto";
            }
        } else if (Array.isArray(respostaObj)) {
            chaveResposta = respostaObj;
        } else {
            chaveResposta = String(respostaObj || "").trim();
        }

        const mapa = campo.mapa_resposta_para_valor || {};
        if (Object.keys(mapa).length === 0) {
            return [null, true];
        }

        if (Array.isArray(chaveResposta)) {
            const valoresEncontrados = [];
            for (const ch of chaveResposta) {
                const chPadrao = padronizarChaveResposta(ch, pergunta, itemTxt, campo.id_campo_alvo, mapaChaves).toLowerCase();
                if (mapa[chPadrao] !== undefined) {
                    valoresEncontrados.push(String(mapa[chPadrao]).trim());
                } else if (mapa[String(ch).toLowerCase()] !== undefined) {
                    valoresEncontrados.push(String(mapa[String(ch).toLowerCase()]).trim());
                }
            }
            if (valoresEncontrados.length > 0) {
                return [valoresEncontrados[0], false];
            }
            if (["1710", "1711", "1739"].includes(String(campo.id_campo_alvo))) {
                return ["1", false];
            }
            return ["0", false];
        }

        const chavePadrao = padronizarChaveResposta(chaveResposta, pergunta, itemTxt, campo.id_campo_alvo, mapaChaves).toLowerCase();
        let valorMapeado = null;

        for (const [k, v] of Object.entries(mapa)) {
            if (k.toLowerCase() === chavePadrao) {
                valorMapeado = v;
                break;
            }
        }

        if (valorMapeado === null) {
            for (const [k, v] of Object.entries(mapa)) {
                if (k.toLowerCase() === String(chaveResposta).toLowerCase()) {
                    valorMapeado = v;
                    break;
                }
            }
        }

        if (valorMapeado === null) {
            for (const [k, v] of Object.entries(mapa)) {
                if (k.toLowerCase().includes(chavePadrao) || chavePadrao.includes(k.toLowerCase())) {
                    valorMapeado = v;
                    break;
                }
            }
        }

        if (valorMapeado === null) {
            if ("texto" in mapa && valorEspecificado) {
                valorMapeado = valorEspecificado;
            } else if ("texto" in mapa && chaveResposta) {
                valorMapeado = chaveResposta;
            } else if (valorEspecificado && (chavePadrao.includes("outro") || String(chaveResposta).toLowerCase().includes("outro") || String(chaveResposta).toLowerCase().includes("especificar"))) {
                const num = extrairNumeroDeTexto(valorEspecificado);
                return num !== null ? [String(num), false] : [valorEspecificado, false];
            } else {
                return [null, true];
            }
        }

        const valStr = String(valorMapeado).trim();
        const valLower = valStr.toLowerCase();

        if (["valor informado", "texto informado", "dias_informados", "valor especificado"].includes(valLower)) {
            if (valorEspecificado) {
                const num = extrairNumeroDeTexto(valorEspecificado);
                return num !== null ? [String(num), false] : [valorEspecificado, false];
            }
            if (chaveResposta && !["outro", "outros", "especificar", "texto"].includes(String(chaveResposta).toLowerCase())) {
                const num = extrairNumeroDeTexto(chaveResposta);
                return num !== null ? [String(num), false] : [chaveResposta, false];
            }
            return [null, true];
        }

        if (valLower === "id_mes_informado" || valLower === "mes_informado") {
            const num = extrairNumeroDeTexto(valorEspecificado) || extrairNumeroDeTexto(chaveResposta);
            if (num !== null && num >= 1 && num <= 12) {
                return [String(num), false];
            }
            return [null, true];
        }

        if (valLower.includes("numero_informado - 12") || valLower.includes("numero_informado-12") || valLower.includes("meses - 12")) {
            const num = extrairNumeroDeTexto(valorEspecificado) || extrairNumeroDeTexto(chaveResposta);
            if (num !== null) {
                return [String(Math.abs(num - 12)), false];
            }
            return [null, true];
        }

        const ano = dataCorrente.getFullYear();
        if (["ano0101", "aaaa0101", "ano0101 (ex.: 20260101)"].includes(valLower)) {
            return [`${ano}0101`, false];
        }

        if (valLower === "ano_corrente") {
            return [String(ano), false];
        }

        return [valStr, false];
    }

    function montarLinha1215(template, idEntidade, valorOuDict, dataCorrente) {
        if (!template) return "";
        if (Array.isArray(template)) {
            return template.map(t => montarLinha1215(t, idEntidade, valorOuDict, dataCorrente));
        }

        if (!dataCorrente) dataCorrente = new Date();
        const ano0101 = `${dataCorrente.getFullYear()}0101`;

        let linha = String(template);
        for (const tag of ["{ANO0101}", "{AAAA0101}", "AAAA0101", "ANO0101"]) {
            linha = linha.split(tag).join(ano0101);
        }

        for (const tag of ["{ID_ENTIDADE}", "{ID_FOLHA}", "{ID_EMPRESA}", "{ID_LOCAL}", "{ID_GRUPO}", "{ID_SIND}"]) {
            linha = linha.split(tag).join(String(idEntidade).trim());
        }

        if (typeof valorOuDict === 'object' && valorOuDict !== null) {
            for (const [k, v] of Object.entries(valorOuDict)) {
                linha = linha.split(`{${k}}`).join(String(v).trim());
                linha = linha.split(`{${k.toUpperCase()}}`).join(String(v).trim());
                linha = linha.split(`{${k.toLowerCase()}}`).join(String(v).trim());
            }
            if (valorOuDict.VALOR !== undefined) linha = linha.split("{VALOR}").join(String(valorOuDict.VALOR).trim());
            if (valorOuDict.DIA !== undefined) linha = linha.split("{DIA}").join(String(valorOuDict.DIA).trim());
            if (valorOuDict.DIAS !== undefined) linha = linha.split("{DIAS}").join(String(valorOuDict.DIAS).trim());
            if (valorOuDict.V !== undefined) linha = linha.split("{V}").join(String(valorOuDict.V).trim());
        } else {
            const valStr = String(valorOuDict).trim();
            linha = linha.split("{VALOR}").join(valStr);
            linha = linha.split("{DIA}").join(valStr);
            linha = linha.split("{DIAS}").join(valStr);
            linha = linha.split("{V}").join(valStr);
        }
        return linha;
    }

    function extrairRespostaProfunda(d, chaves) {
        if (typeof d !== 'object' || d === null) return null;
        for (const k of chaves) {
            if (k && k in d) return d[k];
        }
        for (const v of Object.values(d)) {
            if (typeof v === 'object' && v !== null && !('resposta' in v)) {
                const res = extrairRespostaProfunda(v, chaves);
                if (res !== null) return res;
            }
        }
        return null;
    }

    function processarRegra1409Consolidada(reg, respostasCliente, csvRows, autorizacoesConsultor, ignoreFlags, dataCorrente) {
        if (!dataCorrente) dataCorrente = new Date();
        const ano0101 = `${dataCorrente.getFullYear()}0101`;
        const itemTxt = reg.item_txt || "14 - 4.3 (13o consolidado obj 1409)";

        const subIds = [
            "ferias-antecipa-medias-13",
            "ferias-programacao-automatica",
            "decimo-terceiro-1a-parcela-quando",
            "decimo-terceiro-2a-parcela-quando",
            "decimo-terceiro-processo-separado-circulacao",
            "decimo-terceiro-diferenca-reajuste"
        ];

        if (ignoreFlags[itemTxt] || subIds.every(sid => ignoreFlags[sid])) {
            return [];
        }

        function buscarVal(resps, ...patterns) {
            for (const pat of patterns) {
                if (!pat) continue;
                const res = extrairRespostaProfunda(resps, [pat]);
                if (res !== null && res !== undefined) {
                    if (typeof res === 'object') {
                        return [String(res.resposta || "").trim(), String(res.valor_especificado || "").trim()];
                    }
                    const det = extrairRespostaProfunda(resps, [pat + "_detalhe"]) || "";
                    return [String(res).trim(), String(det).trim()];
                }
                const patLow = pat.toLowerCase();
                function buscaParcial(d) {
                    if (typeof d !== 'object' || d === null) return null;
                    for (const [k, val] of Object.entries(d)) {
                        if (k.endsWith("_detalhe")) continue;
                        if (k.toLowerCase().includes(patLow)) {
                            const det = d[k + "_detalhe"] || "";
                            if (typeof val === 'object' && val !== null) {
                                return [String(val.resposta || "").trim(), String(val.valor_especificado || "").trim()];
                            }
                            return [String(val).trim(), String(det).trim()];
                        }
                        if (typeof val === 'object' && val !== null && !('resposta' in val)) {
                            const sub = buscaParcial(val);
                            if (sub !== null) return sub;
                        }
                    }
                    return null;
                }
                const parcial = buscaParcial(resps);
                if (parcial) return parcial;
            }
            return ["", ""];
        }

        const [r_4_3] = buscarVal(respostasCliente, "ferias-antecipa-medias-13", "antecipa-se as medias de 13o");
        const [r_4_11] = buscarVal(respostasCliente, "ferias-programacao-automatica", "4.11 A empresa utiliza programacao");
        const [r_10_1, d_10_1] = buscarVal(respostasCliente, "decimo-terceiro-1a-parcela-quando", "10.1 Quando e paga a 1a parcela");
        const [r_10_3, d_10_3] = buscarVal(respostasCliente, "decimo-terceiro-2a-parcela-quando", "10.3 Quando e paga a 2a parcela");
        const [r_10_5_1] = buscarVal(respostasCliente, "decimo-terceiro-processo-separado-circulacao", "10.5.1 Caso seja calculado");
        const [r_10_5_3] = buscarVal(respostasCliente, "decimo-terceiro-diferenca-reajuste", "10.5.3 Caso o funcionario");

        const sim_4_3 = ["sim", "s", "1", "true"].includes(r_4_3.toLowerCase());
        const sim_4_11 = ["sim", "s", "1", "true"].includes(r_4_11.toLowerCase());
        const v1 = (sim_4_3 && sim_4_11) ? "1" : "0";

        let mes1 = "11";
        const raw_10_1 = (d_10_1 || r_10_1).toLowerCase();
        if (raw_10_1) {
            if (raw_10_1.includes("novembro") || raw_10_1 === "30_novembro" || raw_10_1 === "11") {
                mes1 = "11";
            } else {
                const num = extrairNumeroDeTexto(raw_10_1);
                if (num && num >= 1 && num <= 12) {
                    mes1 = String(num);
                } else {
                    for (const [mId, mName] of Object.entries(reg.dominio_meses || {})) {
                        if (raw_10_1.includes(mName.toLowerCase())) {
                            mes1 = String(mId);
                            break;
                        }
                    }
                }
            }
        }

        let mes2 = "12";
        const raw_10_3 = (d_10_3 || r_10_3).toLowerCase();
        if (raw_10_3) {
            if (raw_10_3.includes("dezembro") || raw_10_3 === "20_dezembro" || raw_10_3 === "12") {
                mes2 = "12";
            } else {
                const num = extrairNumeroDeTexto(raw_10_3);
                if (num && num >= 1 && num <= 12) {
                    mes2 = String(num);
                } else {
                    for (const [mId, mName] of Object.entries(reg.dominio_meses || {})) {
                        if (raw_10_3.includes(mName.toLowerCase())) {
                            mes2 = String(mId);
                            break;
                        }
                    }
                }
            }
        }

        const nao_10_5_1 = ["nao", "não", "n", "0", "false"].includes(r_10_5_1.toLowerCase());
        const v2 = nao_10_5_1 ? "1" : "0";

        const sim_10_5_3 = ["sim", "s", "1", "true"].includes(r_10_5_3.toLowerCase());
        const v3 = sim_10_5_3 ? "1" : "0";

        let rawTemplate = reg.template_linha_1215 || "91292;26970;({ID_FOLHA})115909;({ANO0101})77832;({V1})27031;({MES1})27032;(81)27033;({MES2})27034;(91)19280;({V2})26990;({V3})";
        if (Array.isArray(rawTemplate)) rawTemplate = rawTemplate[0] || "";

        let template = String(rawTemplate);
        template = template.split("{ANO0101}").join(ano0101).split("{AAAA0101}").join(ano0101).split("AAAA0101").join(ano0101);
        template = template.split("{V1}").join(v1).split("{MES1}").join(mes1).split("{MES2}").join(mes2).split("{V2}").join(v2).split("{V3}").join(v3);

        const folhasCsv = {};
        for (const row of csvRows) {
            const idT = String(row.ID_TRANSACAO_1215 || "").trim();
            const cChave = String(row.ID_CAMPO_CHAVE || "").trim();
            const cAlvo = String(row.ID_CAMPO_ALVO || "").trim();
            const idEnt = String(row.ID_ENTIDADE || "").trim();
            const nomeEnt = String(row.NOME_ENTIDADE || "").trim();
            const valBanco = String(row.VALOR_ATUAL_BANCO || "").trim();

            if ((idT === "91292" || cChave.includes("26970") || ["77832", "27031", "27033", "19280", "26990", "27032", "27034"].includes(cAlvo)) && idEnt) {
                if (!folhasCsv[idEnt]) folhasCsv[idEnt] = { nome: nomeEnt, campos: {} };
                if (cAlvo) folhasCsv[idEnt].campos[cAlvo] = valBanco;
            }
        }

        if (Object.keys(folhasCsv).length === 0) {
            for (const row of csvRows) {
                if (String(row.NIVEL || "").toLowerCase() === "folha") {
                    const idEnt = String(row.ID_ENTIDADE || "").trim();
                    const nomeEnt = String(row.NOME_ENTIDADE || "").trim();
                    if (idEnt && !folhasCsv[idEnt]) {
                        folhasCsv[idEnt] = { nome: nomeEnt, campos: {} };
                    }
                }
            }
        }

        const resultados1409 = [];
        for (const [idFolha, dadosFolha] of Object.entries(folhasCsv)) {
            const camposBanco = dadosFolha.campos || {};
            const nomeFolha = dadosFolha.nome || `Folha ${idFolha}`;

            const banco_77832 = camposBanco["77832"] || "";
            const banco_27031 = camposBanco["27031"] || "";
            const banco_27033 = camposBanco["27033"] || "";
            const banco_19280 = camposBanco["19280"] || "";
            const banco_26990 = camposBanco["26990"] || "";

            const difs = [];
            if (banco_77832 !== "" && normalizarValor(banco_77832) !== normalizarValor(v1)) difs.push(`Médias 1ªP (77832): ${banco_77832}→${v1}`);
            if (banco_27031 !== "" && normalizarValor(banco_27031) !== normalizarValor(mes1)) difs.push(`Mês 1ªP (27031): ${banco_27031}→${mes1}`);
            if (banco_27033 !== "" && normalizarValor(banco_27033) !== normalizarValor(mes2)) difs.push(`Mês 2ªP (27033): ${banco_27033}→${mes2}`);
            if (banco_19280 !== "" && normalizarValor(banco_19280) !== normalizarValor(v2)) difs.push(`Holerite Dez (19280): ${banco_19280}→${v2}`);
            if (banco_26990 !== "" && normalizarValor(banco_26990) !== normalizarValor(v3)) difs.push(`Dif Reajuste (26990): ${banco_26990}→${v3}`);

            if (Object.keys(camposBanco).length === 0 && (r_4_3 || r_10_1 || r_10_3 || r_10_5_1 || r_10_5_3)) {
                difs.push("Configuração inicial 13º");
            }

            const linhaGerada = template.split("{ID_FOLHA}").join(idFolha).split("{ID_ENTIDADE}").join(idFolha);

            let status = "sem_alteracao";
            let motivo = "Sem alteração: todos os parâmetros do 13º já coincidem com o banco de dados.";
            let linhas1215 = [];

            if (difs.length > 0) {
                status = "vai_alterar";
                motivo = "Divergência nos parâmetros do 13º: " + difs.join(", ");
                linhas1215 = [linhaGerada];
            }

            resultados1409.push({
                item_txt: itemTxt,
                id_transacao_1215: reg.id_transacao_1215 || "91292",
                id_campo_chave: reg.id_campo_chave || "26970",
                id_campo_alvo: "CONSOLIDADO_1409",
                literal_campo: "Consolidado 13º Salário (Objeto 1409)",
                nivel: "Folha",
                id_entidade: idFolha,
                nome_entidade: nomeFolha,
                chave_item: `91292_${idFolha}_consolidado`,
                selecionado: true,
                valor_atual_banco: `77832=${banco_77832 || '0'}, 27031=${banco_27031 || '11'}, 27033=${banco_27033 || '12'}, 19280=${banco_19280 || '1'}, 26990=${banco_26990 || '1'}`,
                valor_esperado: `77832=${v1}, 27031=${mes1}, 27033=${mes2}, 19280=${v2}, 26990=${v3}`,
                status: status,
                motivo: motivo,
                linhas_1215: linhas1215,
                exige_autorizacao: false,
                autorizado: true,
                chave_autorizacao: `91292_${idFolha}_consolidado`,
                id_pergunta: "ferias-antecipa-medias-13",
                pergunta_texto: reg.pergunta || "13o consolidado obj 1409",
                ids_perguntas_relacionadas: subIds
            });
        }

        return resultados1409;
    }

    function processarConfronto1215(respostasCliente, csvRows, autorizacoesConsultor, ignoreFlags, dataCorrente, chavesExcluidas) {
        if (!autorizacoesConsultor) autorizacoesConsultor = {};
        if (!ignoreFlags) ignoreFlags = {};
        if (!dataCorrente) dataCorrente = new Date();
        const chavesExcluidasSet = new Set(chavesExcluidas ? Array.from(chavesExcluidas).map(String) : []);

        const regras = (cacheRegras && cacheRegras.regras) ? cacheRegras.regras : [];
        const perguntas = (cachePerguntas && cachePerguntas.perguntas) ? cachePerguntas.perguntas : [];
        const mapaChavesJson = cacheMapaChaves || {};

        const perguntasPorItem = {};
        const perguntaPorId = {};
        for (const p of perguntas) {
            if (p.id_pergunta) perguntaPorId[p.id_pergunta] = p;
            if (p.item_txt_relacionado) {
                if (!perguntasPorItem[p.item_txt_relacionado]) perguntasPorItem[p.item_txt_relacionado] = [];
                perguntasPorItem[p.item_txt_relacionado].push(p);
            }
        }

        for (const p of perguntas) {
            if (p.id_pergunta === "folha-bolsa-estagio-regra") {
                if (!perguntasPorItem["13 - 3.21"]) perguntasPorItem["13 - 3.21"] = [];
                perguntasPorItem["13 - 3.21"].push(p);
            }
        }

        const csvPorCampoAlvo = {};
        for (const row of csvRows) {
            const campoAlvo = String(row.ID_CAMPO_ALVO || "").trim();
            if (campoAlvo) {
                if (!csvPorCampoAlvo[campoAlvo]) csvPorCampoAlvo[campoAlvo] = [];
                csvPorCampoAlvo[campoAlvo].push(row);
            }
        }

        const resultados = [];
        const resumo = {
            total_confrontados: 0,
            vai_alterar: 0,
            sem_alteracao: 0,
            revisar: 0,
            pendente: 0,
            requer_autorizacao: 0
        };

        for (const reg of regras) {
            const itemTxt = reg.item_txt || "";

            if (itemTxt.includes("14 - 4.3 (13o consolidado obj 1409)") || (reg.id_transacao_1215 === "91292" && (String(reg.template_linha_1215 || "").includes("{ANO0101}") || String(reg.template_linha_1215 || "").includes("{V1}")))) {
                const itens1409 = processarRegra1409Consolidada(reg, respostasCliente, csvRows, autorizacoesConsultor, ignoreFlags, dataCorrente);
                for (const it of itens1409) {
                    resumo.total_confrontados++;
                    if (it.status === "vai_alterar") resumo.vai_alterar++;
                    else if (it.status === "sem_alteracao") resumo.sem_alteracao++;
                    else if (it.status === "pendente") resumo.pendente++;
                    else if (it.status === "revisar") resumo.revisar++;
                    else if (it.status === "requer_autorizacao") resumo.requer_autorizacao++;
                    resultados.push(it);
                }
                continue;
            }

            const perguntasRel = perguntasPorItem[itemTxt] || [];
            let perguntaPrincipal = perguntasRel.length > 0 ? perguntasRel[0] : null;

            if (!perguntaPrincipal) {
                for (const p of perguntas) {
                    if (p.item_txt_relacionado && itemTxt && p.item_txt_relacionado.trim() === itemTxt.trim()) {
                        perguntaPrincipal = p;
                        break;
                    }
                }
            }

            const pId = perguntaPrincipal ? perguntaPrincipal.id_pergunta : null;
            const pTexto = perguntaPrincipal ? perguntaPrincipal.texto : reg.pergunta;
            const pSecao = perguntaPrincipal ? perguntaPrincipal.secao : reg.nivel;

            let isIgnored = false;
            for (const ck of [pId, pTexto, itemTxt]) {
                if (!ck) continue;
                if (ignoreFlags[ck] === true || ignoreFlags[ck + "_ignore"] === true) {
                    isIgnored = true;
                    break;
                }
            }
            if (isIgnored) continue;

            let respObj = null;
            for (const chaveCandidata of [pId, pTexto, itemTxt, reg.pergunta]) {
                if (chaveCandidata && chaveCandidata in respostasCliente) {
                    respObj = respostasCliente[chaveCandidata];
                    break;
                }
            }

            if (respObj === null) {
                respObj = extrairRespostaProfunda(respostasCliente, [pId, pTexto, itemTxt, reg.pergunta]);
            }

            if (respObj === null) {
                for (const [kResp, vResp] of Object.entries(respostasCliente)) {
                    if (pId && (kResp.includes(pId) || pId.includes(kResp))) {
                        respObj = vResp;
                        break;
                    }
                    if (itemTxt && (kResp.includes(itemTxt) || itemTxt.includes(kResp))) {
                        respObj = vResp;
                        break;
                    }
                }
            }

            let valorEspecificado = "";
            if (typeof respObj === 'object' && respObj !== null && !Array.isArray(respObj)) {
                valorEspecificado = respObj.valor_especificado || "";
            } else if (pTexto) {
                const detalheKey = pTexto + "_detalhe";
                if (detalheKey in respostasCliente) {
                    valorEspecificado = respostasCliente[detalheKey];
                } else if (pSecao && typeof respostasCliente[pSecao] === 'object') {
                    valorEspecificado = respostasCliente[pSecao][detalheKey] || "";
                }
            }

            if (typeof respObj !== 'object' || respObj === null || Array.isArray(respObj)) {
                respObj = { resposta: respObj, valor_especificado: valorEspecificado };
            } else if (!respObj.valor_especificado && valorEspecificado) {
                respObj.valor_especificado = valorEspecificado;
            }

            const temResposta = respObj.resposta !== null && respObj.resposta !== undefined && respObj.resposta !== "";

            for (const campo of (reg.campos || [])) {
                const idCampoAlvo = String(campo.id_campo_alvo || "").trim();
                let linhasCsv = csvPorCampoAlvo[idCampoAlvo] || [];

                if (linhasCsv.length === 0) {
                    linhasCsv = csvRows.filter(r => r.ITEM_TXT === itemTxt);
                }

                if (linhasCsv.length === 0) continue;

                for (const lCsv of linhasCsv) {
                    const nomeEntidade = lCsv.NOME_ENTIDADE || "Geral";
                    const idEntidade = lCsv.ID_ENTIDADE || "0";
                    const nivel = lCsv.NIVEL || reg.nivel || "";
                    const valorAtualBanco = lCsv.VALOR_ATUAL_BANCO || "";

                    if (nivel.toLowerCase().includes("grupo") && (["0", ""].includes(String(idEntidade).trim()) || ["nenhum", "nenhuma", "sem grupo"].includes(String(nomeEntidade).trim().toLowerCase()))) {
                        continue;
                    }

                    resumo.total_confrontados++;

                    const [esperado, pendente] = resolverValorEsperado(campo, respObj, perguntaPrincipal, itemTxt, dataCorrente, mapaChavesJson);
                    const atualNorm = normalizarValor(valorAtualBanco);
                    const esperadoNorm = normalizarValor(esperado);

                    const condicao = String(reg.condicao_geracao || "").toLowerCase();
                    const exigeAutorizacao = condicao.includes("autorizacao") || condicao.includes("autorização");
                    const chaveAut = `${reg.id_transacao_1215}_${idEntidade}_${idCampoAlvo}`;
                    const autorizado = Boolean(autorizacoesConsultor[chaveAut]);

                    let status = "";
                    let motivo = "";
                    const linhasGeradas = [];

                    function adicionarLinhas(tmpl, val) {
                        if (!tmpl) return;
                        let res;
                        if (typeof tmpl === 'string' && (tmpl.includes("{NOME}") || tmpl.includes("{CPF}"))) {
                            const dadosResp = extrairDadosResponsavel(respObj);
                            const valDict = {
                                NOME: dadosResp.nome || "",
                                CPF: dadosResp.cpf || "",
                                VALOR: (typeof val === 'object' && val !== null) ? val.VALOR : val
                            };
                            res = montarLinha1215(tmpl, idEntidade, valDict, dataCorrente);
                        } else {
                            res = montarLinha1215(tmpl, idEntidade, val, dataCorrente);
                        }
                        if (Array.isArray(res)) {
                            for (const rL of res) {
                                if (rL && !linhasGeradas.includes(rL)) linhasGeradas.push(rL);
                            }
                        } else if (res && !linhasGeradas.includes(res)) {
                            linhasGeradas.push(res);
                        }
                    }

                    let tmplAlvo = campo.template_linha_1215 || reg.template_linha_1215;
                    if (tmplAlvo && String(tmplAlvo).includes(" / ")) {
                        const parts = String(tmplAlvo).split(" / ");
                        const filtered = parts.filter(p => p.includes(String(idCampoAlvo)) || (campo.id_campo_chave_campo && p.includes(String(campo.id_campo_chave_campo))));
                        if (filtered.length > 0) tmplAlvo = filtered.join(" / ");
                    }

                    if (!temResposta || pendente || esperado === null) {
                        status = "pendente";
                        motivo = "Pergunta ainda não respondida ou valor especificado ausente.";
                        resumo.pendente++;
                    } else if (atualNorm === esperadoNorm) {
                        status = "sem_alteracao";
                        motivo = `Valor no banco (${valorAtualBanco || 'vazio'}) já coincide com o valor esperado (${esperado}).`;
                        resumo.sem_alteracao++;
                    } else if (exigeAutorizacao && !autorizado) {
                        status = "requer_autorizacao";
                        motivo = `Regra exige autorização explícita do consultor (${reg.condicao_geracao}).`;
                        resumo.requer_autorizacao++;
                        adicionarLinhas(tmplAlvo, esperado);
                    } else if (reg.divergencia) {
                        status = "revisar";
                        motivo = `Divergência registrada na regra: ${reg.divergencia}`;
                        resumo.revisar++;
                        adicionarLinhas(tmplAlvo, esperado);
                    } else {
                        status = "vai_alterar";
                        motivo = `Valor no banco (${valorAtualBanco || 'não gravado'}) difere do esperado (${esperado}).`;
                        resumo.vai_alterar++;

                        if (reg.multi_linha && reg.multi_linha_regra) {
                            const mlRegra = reg.multi_linha_regra;
                            const respRaw = String(respObj.resposta || "").trim().toLowerCase();
                            let listaItensMl = [];
                            for (const [mlK, mlV] of Object.entries(mlRegra)) {
                                const mlKLower = mlK.toLowerCase();
                                if ((["seg_qui", "de segunda a quinta"].includes(respRaw) && mlKLower.includes("segunda a quinta")) ||
                                    (["1dia_util", "somente no 1o dia"].includes(respRaw) && mlKLower.includes("1o dia")) ||
                                    (["qualquer_exceto_folga", "qualquer dia"].includes(respRaw) && mlKLower.includes("qualquer")) ||
                                    (["sim_sexta", "sim"].includes(respRaw) && mlKLower.includes("sim")) ||
                                    (["nao_quinta", "nao"].includes(respRaw) && mlKLower.includes("nao")) ||
                                    (respRaw === mlKLower || mlKLower.includes(respRaw) || respRaw.includes(mlKLower))) {
                                    listaItensMl = mlV;
                                    break;
                                }
                            }
                            for (const itemM of listaItensMl) {
                                adicionarLinhas(tmplAlvo, itemM);
                            }
                        } else {
                            adicionarLinhas(tmplAlvo, esperado);
                        }
                    }

                    const chaveItem = `${reg.id_transacao_1215}_${idEntidade}_${idCampoAlvo}`;
                    let isSelecionado = true;
                    if (chavesExcluidasSet.has(chaveItem) || chavesExcluidasSet.has(`entidade_${idEntidade}`)) {
                        isSelecionado = false;
                    }

                    resultados.push({
                        item_txt: itemTxt,
                        chave_item: chaveItem,
                        selecionado: isSelecionado,
                        id_pergunta: pId,
                        secao: pSecao,
                        pergunta_texto: pTexto,
                        resposta_dada: respObj.resposta,
                        valor_especificado: respObj.valor_especificado,
                        id_transacao_1215: reg.id_transacao_1215,
                        id_campo_chave: reg.id_campo_chave,
                        id_campo_alvo: idCampoAlvo,
                        nome_fisico: campo.nome_fisico || "",
                        literal_campo: campo.literal || "",
                        nome_entidade: nomeEntidade,
                        id_entidade: idEntidade,
                        nivel: nivel,
                        valor_atual_banco: valorAtualBanco,
                        valor_esperado: esperado,
                        status: status,
                        motivo: motivo,
                        linhas_1215: linhasGeradas,
                        semantica_invertida: Boolean(reg.semantica_invertida),
                        exige_autorizacao: exigeAutorizacao,
                        autorizado: autorizado,
                        chave_autorizacao: chaveAut
                    });
                }
            }
        }

        if (chavesExcluidasSet.size > 0) {
            for (const r of resultados) {
                if (chavesExcluidasSet.has(r.chave_item) || chavesExcluidasSet.has(`entidade_${r.id_entidade}`)) {
                    r.selecionado = false;
                }
            }
        }

        return { resumo, resultados };
    }

    function gerarArquivo1215(processamentoResultado, autorizacoes, chavesExcluidas) {
        if (!autorizacoes) autorizacoes = {};
        const chavesExcluidasSet = new Set(chavesExcluidas ? Array.from(chavesExcluidas).map(String) : []);
        const linhasFinais = [];
        const resultados = (processamentoResultado && processamentoResultado.resultados) ? processamentoResultado.resultados : [];

        for (const r of resultados) {
            const status = r.status;
            const chaveAut = r.chave_autorizacao;
            const chaveIt = r.chave_item || `${r.id_transacao_1215}_${r.id_entidade}_${r.id_campo_alvo}`;
            const idEnt = String(r.id_entidade || "").trim();

            if (!r.selecionado || chavesExcluidasSet.has(chaveIt) || chavesExcluidasSet.has(`entidade_${idEnt}`)) {
                continue;
            }

            const estaAutorizado = Boolean(autorizacoes[chaveAut] || r.autorizado);
            let podeExportar = false;

            if (status === "vai_alterar") {
                podeExportar = true;
            } else if (["revisar", "requer_autorizacao"].includes(status) && estaAutorizado) {
                podeExportar = true;
            }

            if (podeExportar) {
                for (const linha of (r.linhas_1215 || [])) {
                    const linhaLimpa = String(linha).trim();
                    if (linhaLimpa && !linhasFinais.includes(linhaLimpa)) {
                        linhasFinais.push(linhaLimpa);
                    }
                }
            }
        }

        return linhasFinais.join("\r\n");
    }

    function gerarRelatorioAuditoriaCsv(processamentoResultado, chavesExcluidas) {
        const chavesExcluidasSet = new Set(chavesExcluidas ? Array.from(chavesExcluidas).map(String) : []);
        const resultados = (processamentoResultado && processamentoResultado.resultados) ? processamentoResultado.resultados : [];

        function escapeCsv(val) {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        }

        const linhasCsv = [];
        linhasCsv.push([
            "ITEM_REGRA", "ID_PERGUNTA", "SEÇÃO", "PERGUNTA", "RESPOSTA_CLIENTE",
            "NÍVEL", "ID_ENTIDADE", "NOME_ENTIDADE", "CAMPO_ALVO", "NOME_FISICO",
            "VALOR_ATUAL_BANCO", "VALOR_ESPERADO", "STATUS", "MOTIVO", "LINHAS_1215_GERADAS"
        ].map(escapeCsv).join(";"));

        for (const r of resultados) {
            const chaveIt = r.chave_item || `${r.id_transacao_1215}_${r.id_entidade}_${r.id_campo_alvo}`;
            const idEnt = String(r.id_entidade || "").trim();
            let status = r.status || "";
            let motivo = r.motivo || "";
            let linhas = Array.from(r.linhas_1215 || []);

            const foiDesmarcado = (!r.selecionado || chavesExcluidasSet.has(chaveIt) || chavesExcluidasSet.has(`entidade_${idEnt}`));
            if (foiDesmarcado && ["vai_alterar", "revisar", "requer_autorizacao"].includes(status)) {
                status = "desmarcado_consultor";
                motivo = `[DESMARCADO PELO CONSULTOR] ${motivo}`;
                linhas = [];
            }

            linhasCsv.push([
                r.item_txt || "",
                r.id_pergunta || "",
                r.secao || "",
                r.pergunta_texto || "",
                r.resposta_dada || "",
                r.nivel || "",
                r.id_entidade || "",
                r.nome_entidade || "",
                r.id_campo_alvo || "",
                r.nome_fisico || "",
                r.valor_atual_banco || "",
                r.valor_esperado || "",
                status,
                motivo,
                linhas.join(" | ")
            ].map(escapeCsv).join(";"));
        }

        // BOM UTF-8 (\uFEFF) para abrir formatado no Excel
        return "\uFEFF" + linhasCsv.join("\r\n");
    }

    return {
        init,
        initWithStrings,
        parseCsvGA,
        normalizarValor,
        extrairNumeroDeTexto,
        formatarCpf,
        extrairDadosResponsavel,
        resolverValorEsperado,
        montarLinha1215,
        processarConfronto1215,
        gerarArquivo1215,
        gerarRelatorioAuditoriaCsv,
        getDicionario: async function () {
            await init();
            return cacheDicionario;
        }
    };
}));
