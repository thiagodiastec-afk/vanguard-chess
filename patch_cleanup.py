import re
with open("src/App.tsx", "r") as f:
    content = f.read()

# Add a reference object outside to hold unsubscribes
ref_code = """
  useEffect(() => {
    let unsubs: any[] = [];
    
    initFirebase().then(({ auth, db }) => {
      setFirebaseReady(true);
      
      const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
        // Clear previous listeners
        unsubs.forEach(u => u());
        unsubs = [];

        setUser(firebaseUser);
"""

content = content.replace("""
  useEffect(() => {
    initFirebase().then(({ auth, db }) => {
      setFirebaseReady(true);
      
      const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
        setUser(firebaseUser);
""", ref_code[1:])

# Replace all const unsubscribeXYZ = onSnapshot(...) with unsubs.push(onSnapshot(...))
# Wait, let's just make it simple:
content = content.replace("const unsubscribeChallenges = onSnapshot", "const unsubscribeChallenges = onSnapshot")
# we can just use regex to replace all `const unsubscribeXYZ = onSnapshot` with `unsubs.push(onSnapshot` in the if (firebaseUser) block?
# Or maybe it's easier to just do it manually.

with open("src/App.tsx", "w") as f:
    f.write(content)
