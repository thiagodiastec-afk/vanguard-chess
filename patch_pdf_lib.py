import re

with open("src/components/About.tsx", "r") as f:
    code = f.read()

import_jspdf = "import jsPDF from 'jspdf';\n"
if "jspdf" not in code:
    code = import_jspdf + code

pdf_logic = """// Gerar um documento de texto com as regras e baixar como txt
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
              document.body.removeChild(a);"""

real_pdf_logic = """const doc = new jsPDF();
              
              doc.setFontSize(16);
              doc.setTextColor(20, 184, 166); // Emerald color
              doc.text("VANGUARD CHESS", 20, 20);
              
              doc.setFontSize(12);
              doc.setTextColor(0, 0, 0);
              doc.text("POLÍTICA DE SEGURANÇA E REGRAS DE USUÁRIO", 20, 30);
              
              doc.setFontSize(10);
              const text = `
1. CRIPTOGRAFIA E PROTEÇÃO DE DADOS
Todas as conexões são protegidas com criptografia SSL/TLS em trânsito.
Seus dados repousam nos servidores Google Cloud Platform com criptografia padrão AES-256.
Senhas nunca são salvas em texto limpo. Utilizamos Google Firebase Authentication.

2. FAIR PLAY (JOGO JUSTO)
- É terminantemente proibido o uso de motores de xadrez externos (Stockfish, etc) 
  durante as partidas ranqueadas.
- Qualquer detecção de assistência robótica resultará no banimento imediato e 
  permanente da conta.
- Não é permitido desconectar intencionalmente para evitar derrotas ou abusar 
  do tempo do oponente.

3. CONDIÇÕES GERAIS
O Vanguard Chess reserva-se no direito de revisar partidas para auditoria de fair play.
Este ambiente é monitorado para garantir um local seguro e saudável para toda a 
comunidade enxadrística.

Última atualização: Setembro de 2026`;

              doc.text(text, 20, 40);
              doc.save("VanguardChess_Seguranca_Regras.pdf");"""

code = code.replace(pdf_logic, real_pdf_logic)

with open("src/components/About.tsx", "w") as f:
    f.write(code)

