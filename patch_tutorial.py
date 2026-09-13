with open("src/components/Tutorial.tsx", "r") as f:
    code = f.read()

# Remove the missing #tutorial-play-friend step
old_steps = """    // LOBBY STEPS (0, 1, 2)
    {
      target: '#tutorial-play-ai',
      content: 'Bem-vindo ao Vanguard Chess! Aqui você pode iniciar uma partida contra a Inteligência Artificial para treinar.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '#tutorial-play-friend',
      content: 'Você também pode convidar um amigo para jogar online.',
      placement: 'bottom',
    },
    {
      target: '#tutorial-pass-play',
      content: 'Ou jogar no modo Pass & Play, compartilhando o mesmo dispositivo!',
      placement: 'top',
    },"""

new_steps = """    // LOBBY STEPS (0, 1)
    {
      target: '#tutorial-play-ai',
      content: 'Bem-vindo ao Vanguard Chess! Aqui você pode iniciar uma partida contra a Inteligência Artificial para treinar.',
      disableBeacon: true as any,
      placement: 'bottom',
    },
    {
      target: '#tutorial-pass-play',
      content: 'Ou jogar no modo Pass & Play, compartilhando o mesmo dispositivo!',
      placement: 'top',
    },"""

code = code.replace(old_steps, new_steps)

code = code.replace("if (index === 2 && !inGame) {", "if (index === 1 && !inGame) {")
code = code.replace("setStepIndex(3); // Start at game steps", "setStepIndex(2); // Start at game steps")

with open("src/components/Tutorial.tsx", "w") as f:
    f.write(code)

