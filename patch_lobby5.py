import re

with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

code = code.replace(
    "onClick={() => { setTimeControl(tc.val); findMatch(); }}",
    "onClick={() => { if(currentUser) { setTimeControl(tc.val); findMatch(); } else { onLoginRequest?.(); } }}"
)

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

