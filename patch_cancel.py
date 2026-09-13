with open("src/components/Lobby.tsx", "r") as f:
    code = f.read()

old_cancel = """  const cancelSearch = async () => {
    if (!currentUser) return;
    try {
      const db = getDb();
      await deleteDoc(doc(db, 'queue', currentUser.uid));
    } catch (err) {
      console.error("Error canceling search:", err);
    }
  };"""

new_cancel = """  const cancelSearch = async () => {
    console.log("Cancel search clicked!");
    if (!currentUser) return;
    try {
      setIsSearching(false); // Force local state update
      const db = getDb();
      await deleteDoc(doc(db, 'queue', currentUser.uid));
      console.log("Queue doc deleted!");
    } catch (err) {
      console.error("Error canceling search:", err);
    }
  };"""

code = code.replace(old_cancel, new_cancel)

with open("src/components/Lobby.tsx", "w") as f:
    f.write(code)

