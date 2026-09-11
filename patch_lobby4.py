import re

with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

# We need to find the `createInvite` and `handleCreateGame` wrappers or just patch the JSX.

code = code.replace("onClick={createInvite}", "onClick={currentUser ? createInvite : onLoginRequest}")

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

