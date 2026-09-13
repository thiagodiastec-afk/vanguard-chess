with open("firestore.rules", "r") as f:
    code = f.read()

code = code.replace("allow delete: if isSignedIn() && existing().uid == request.auth.uid;",
                    "allow delete: if isSignedIn() && queueId == request.auth.uid;")

with open("firestore.rules", "w") as f:
    f.write(code)

