with open("firestore.rules", "r") as f:
    content = f.read()

content = content.replace("      // Only players in the game can update it\n      allow update: if isSignedIn()\n        && (existing().whiteId == request.auth.uid || existing().blackId == request.auth.uid);", 
"      // Only players in the game can update it, OR a user joining an invite\n      allow update: if isSignedIn()\n        && (\n          existing().whiteId == request.auth.uid || \n          existing().blackId == request.auth.uid ||\n          (existing().status == 'waiting_friend' && existing().blackId == '' && incoming().blackId == request.auth.uid)\n        );")

with open("firestore.rules", "w") as f:
    f.write(content)
