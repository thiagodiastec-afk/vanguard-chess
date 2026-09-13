with open("src/App.tsx", "r") as f:
    content = f.read()

replacement = """      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Atenção! Você está usando um domínio personalizado. Você precisa adicionar '" + window.location.hostname + "' na lista de Domínios Autorizados lá no painel do Firebase (Authentication > Settings > Authorized domains).");
      } else {"""

content = content.replace("} else if (error.code === 'auth/popup-closed-by-user') {\n        // Usuário fechou a janela, não faz nada\n      } else {", "} else if (error.code === 'auth/popup-closed-by-user') {\n        // Usuário fechou a janela, não faz nada\n" + replacement)

with open("src/App.tsx", "w") as f:
    f.write(content)
