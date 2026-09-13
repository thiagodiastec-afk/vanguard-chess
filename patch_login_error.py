with open("src/App.tsx", "r") as f:
    content = f.read()

replacement = """      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Atenção! Você está usando um domínio personalizado. Você precisa adicionar '" + window.location.hostname + "' na lista de Domínios Autorizados lá no painel do Firebase (Authentication > Settings > Authorized domains).");
      } else {
        alert("Erro detalhado: " + error.code + " - " + error.message + "\\n\\nSe estiver usando Safari ou bloqueador de pop-ups, desative-o.");
      }"""

content = content.replace("""      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Atenção! Você está usando um domínio personalizado. Você precisa adicionar '" + window.location.hostname + "' na lista de Domínios Autorizados lá no painel do Firebase (Authentication > Settings > Authorized domains).");
      } else {
        alert("Falha ao abrir a janela de login. Se você estiver usando Safari ou bloqueadores de pop-up, tente permitir pop-ups para esta página ou clique no botão de 'Device' ou 'Remix' no canto superior direito para abrir o app em uma nova guia.");
      }""", replacement)

with open("src/App.tsx", "w") as f:
    f.write(content)
