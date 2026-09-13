import re

with open("src/components/NicknameModal.tsx", "r") as f:
    code = f.read()

# Replace initial state to not prepopulate if it looks like an email or phone number
code = code.replace(
    "const [nickname, setNickname] = useState(currentUser.displayName || '');",
    "const [nickname, setNickname] = useState(() => {\n    const name = currentUser.displayName || '';\n    if (name.includes('@') || /^[0-9+() -]{7,}$/.test(name)) return '';\n    return name;\n  });"
)

# Add regex validation in handleSubmit
validation_insert = """    if (nickname.trim().length > 15) {
      setError('O apelido deve ter no máximo 15 caracteres.');
      return;
    }

    if (!/^[a-zA-Z0-9_\-\s]+$/.test(nickname.trim())) {
      setError('Use apenas letras, números, espaços, traços e underscores. Emails ou números de telefone não são permitidos para sua segurança.');
      return;
    }
"""

code = code.replace("""    if (nickname.trim().length > 15) {
      setError('O apelido deve ter no máximo 15 caracteres.');
      return;
    }""", validation_insert)


with open("src/components/NicknameModal.tsx", "w") as f:
    f.write(code)

