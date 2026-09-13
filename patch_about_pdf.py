import re

with open("src/components/About.tsx", "r") as f:
    code = f.read()

# Make sure Download is imported
if "Download" not in code:
    code = code.replace("import { Mail, Shield, FileText, Code, Server, HeartHandshake }", "import { Mail, Shield, FileText, Code, Server, HeartHandshake, Download }")
    if "Download" not in code:
        code = code.replace("from 'lucide-react'", ", Download } from 'lucide-react'")

pdf_download_section = """        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold">Segurança & Privacidade</h2>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">
            A transparência e a segurança dos seus dados são fundamentais para nós. Disponibilizamos um documento completo detalhando nossa infraestrutura de segurança criptografada e as regras de conduta para os usuários.
          </p>
          <button 
            onClick={() => {
              // Gerar um documento de texto com as regras e baixar como txt
              // Isso simula o download do documento
              const content = `VANGUARD CHESS - POLÍTICA DE SEGURANÇA E REGRAS DE USUÁRIO

1. CRIPTOGRAFIA E PROTEÇÃO DE DADOS
Todas as conexões são protegidas com criptografia SSL/TLS em trânsito.
Seus dados repousam nos servidores Google Cloud Platform com criptografia padrão AES-256.
Senhas nunca são salvas em texto limpo. Utilizamos Google Firebase Authentication (Scrypt).

2. FAIR PLAY (JOGO JUSTO)
- É terminantemente proibido o uso de motores de xadrez externos (Stockfish, Komodo, etc) durante as partidas ranqueadas.
- Qualquer detecção de assistência robótica resultará no banimento imediato e permanente da conta.
- Não é permitido desconectar intencionalmente para evitar derrotas ou abusar do tempo do oponente.

3. CONDIÇÕES GERAIS
O Vanguard Chess reserva-se no direito de revisar partidas para auditoria de fair play.
Este ambiente é monitorado para garantir um local seguro e saudável para toda a comunidade enxadrística.

Última atualização: Setembro de 2026`;
              const blob = new Blob([content], { type: 'text/plain' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'VanguardChess_Seguranca_Regras.txt';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            }}
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-4 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto justify-center"
          >
            <Download className="w-4 h-4" />
            Baixar Documento de Segurança e Regras
          </button>
        </div>

        {/* Legal & Terms placeholders */}"""

if "Baixar Documento de Segurança" not in code:
    code = code.replace("        {/* Legal & Terms placeholders */}", pdf_download_section)

with open("src/components/About.tsx", "w") as f:
    f.write(code)

