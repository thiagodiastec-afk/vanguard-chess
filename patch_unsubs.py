with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace("const unsubscribeChallenges = onSnapshot", "unsubs.push(onSnapshot")
content = content.replace("const unsubscribeMyChallenges = onSnapshot", "unsubs.push(onSnapshot")
content = content.replace("const unsubscribeUser = onSnapshot", "unsubs.push(onSnapshot")
content = content.replace("const unsubscribeGames = onSnapshot", "unsubs.push(onSnapshot")
content = content.replace("return () => unsubscribeAuth();", "return () => { unsubscribeAuth(); unsubs.forEach(u => u()); };")

with open("src/App.tsx", "w") as f:
    f.write(content)
