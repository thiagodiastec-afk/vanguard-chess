with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

old_effect = """  useEffect(() => {
    if (!currentUser) return;
    const db = getDb();
    const queueRef = doc(db, 'queue', currentUser.uid);
    
    const unsubscribe = onSnapshot(queueRef, (doc) => {
      setIsSearching(doc.exists());
    });
    
    return unsubscribe;
  }, [currentUser?.uid]);"""

new_effect = """  useEffect(() => {
    if (!currentUser) return;
    const db = getDb();
    const queueRef = doc(db, 'queue', currentUser.uid);
    
    // Clear any stale queue document when lobby mounts to avoid auto-searching
    deleteDoc(queueRef).catch(console.error);
    
  }, [currentUser?.uid]);"""

code = code.replace(old_effect, new_effect)

# Update findMatch to set isSearching = true
old_find = """  const findMatch = async () => {
    if (!currentUser) {
      onLoginRequest?.();
      return;
    }
    setError(null);
    const db = getDb();
    
    try {"""

new_find = """  const findMatch = async () => {
    if (!currentUser) {
      onLoginRequest?.();
      return;
    }
    setError(null);
    setIsSearching(true);
    const db = getDb();
    
    try {"""

code = code.replace(old_find, new_find)


with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

