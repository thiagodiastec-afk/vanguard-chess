import re

with open("index.html", "r") as f:
    html = f.read()

protection_script = """
    <style>
      body {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      input, textarea {
        -webkit-user-select: auto !important;
        -khtml-user-select: auto !important;
        -moz-user-select: auto !important;
        -ms-user-select: auto !important;
        user-select: auto !important;
      }
    </style>
    <script>
      // Desativar clique direito
      document.addEventListener('contextmenu', event => event.preventDefault());

      // Desativar atalhos de desenvolvedor
      document.addEventListener('keydown', function (event) {
        // Prevenir F12
        if (event.keyCode === 123) {
          event.preventDefault();
        }
        // Prevenir Ctrl+Shift+I (Inspecionar)
        if (event.ctrlKey && event.shiftKey && event.keyCode === 73) {
          event.preventDefault();
        }
        // Prevenir Ctrl+Shift+J (Console)
        if (event.ctrlKey && event.shiftKey && event.keyCode === 74) {
          event.preventDefault();
        }
        // Prevenir Ctrl+Shift+C (Inspecionar Elemento)
        if (event.ctrlKey && event.shiftKey && event.keyCode === 67) {
          event.preventDefault();
        }
        // Prevenir Ctrl+U (Ver código-fonte)
        if (event.ctrlKey && event.keyCode === 85) {
          event.preventDefault();
        }
      });
    </script>
  </head>
"""

if "Desativar clique direito" not in html:
    html = html.replace("</head>", protection_script)

with open("index.html", "w") as f:
    f.write(html)
