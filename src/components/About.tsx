import jsPDF from 'jspdf';
import { Mail, Shield, FileText, Code, Server, HeartHandshake, Download } from 'lucide-react';
import { cn } from '../lib/utils';

export default function About() {
  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-amber-500">Vanguard Chess</h1>
          <p className="text-zinc-400">Versão 1.0.0 (Beta)</p>
        </div>

        {/* Software Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold">Sobre o Software</h2>
          </div>
          <p className="text-zinc-300 leading-relaxed">
            O <strong>Vanguard Chess</strong> é uma plataforma moderna e avançada para jogadores de xadrez de todos os níveis. 
            Desenvolvido com tecnologias de ponta, incluindo Inteligência Artificial do Google (Gemini) e bancos de dados em tempo real, 
            nosso objetivo é oferecer a melhor, mais rápida e mais segura experiência de xadrez online.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-300 mb-2">
                <Server className="w-4 h-4 text-blue-400" />
                <span className="font-medium">Infraestrutura</span>
              </div>
              <ul className="text-sm text-zinc-500 space-y-1">
                <li>React 18 & TypeScript</li>
                <li>Google Cloud (Firestore Realtime)</li>
                <li>Motor de Xadrez (Chess.js)</li>
              </ul>
            </div>
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-300 mb-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Segurança & Fair Play</span>
              </div>
              <ul className="text-sm text-zinc-500 space-y-1">
                <li>Validador de lances Backend</li>
                <li>Análise Anti-Cheat Baseada em IA</li>
                <li>Conexão Criptografada</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact & Support */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <HeartHandshake className="w-5 h-5 text-rose-400" />
            <h2 className="text-xl font-semibold">Contato e Suporte</h2>
          </div>
          <p className="text-zinc-300">
            Tem alguma dúvida, encontrou um bug ou quer sugerir uma nova funcionalidade? Nossa equipe de suporte está pronta para te ajudar.
          </p>
          
          <div className="flex flex-col gap-3 mt-4">
            <a href="mailto:suporte@vanguardchess.com.br" className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 p-4 rounded-lg hover:border-amber-500/50 transition-colors group">
              <div className="bg-zinc-900 p-2 rounded group-hover:bg-amber-500/10 transition-colors">
                <Mail className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-200">E-mail de Suporte</div>
                <div className="text-sm text-zinc-500">suporte@vanguardchess.com.br</div>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold">Segurança & Privacidade</h2>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">
            A transparência e a segurança dos seus dados são fundamentais para nós. Disponibilizamos um documento completo detalhando nossa infraestrutura de segurança criptografada e as regras de conduta para os usuários.
          </p>
          <button 
            onClick={() => {
              const doc = new jsPDF();
              
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
              doc.save("VanguardChess_Seguranca_Regras.pdf");
            }}
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-4 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto justify-center"
          >
            <Download className="w-4 h-4" />
            Baixar Documento de Segurança e Regras
          </button>
        </div>

        {/* Legal & Terms placeholders */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-semibold">Termos Legais</h2>
          </div>
          <div className="flex flex-col gap-2 text-sm text-zinc-400">
            <a href="#" className="hover:text-amber-500 transition-colors">» Termos de Serviço</a>
            <a href="#" className="hover:text-amber-500 transition-colors">» Política de Privacidade</a>
            <a href="#" className="hover:text-amber-500 transition-colors">» Regras de Fair Play (Jogo Justo)</a>
            <a href="#" className="hover:text-amber-500 transition-colors">» Política de Reembolso (VIP e Moedas)</a>
          </div>
        </div>
        
        <div className="text-center text-xs text-zinc-600 pb-8">
          &copy; {new Date().getFullYear()} Vanguard Chess. Todos os direitos reservados.
        </div>

      </div>
    </div>
  );
}
