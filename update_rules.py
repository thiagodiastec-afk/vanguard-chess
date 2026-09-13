import re

with open("firestore.rules", "r") as f:
    rules = f.read()

# Make public reads for Lobby collections
rules = rules.replace("match /users/{userId} {\n      allow read: if isSignedIn();", "match /users/{userId} {\n      allow read: if true;")
rules = rules.replace("match /queue/{queueId} {\n      allow read: if isSignedIn();", "match /queue/{queueId} {\n      allow read: if true;")
rules = rules.replace("match /games/{gameId} {\n      allow read: if isSignedIn();", "match /games/{gameId} {\n      allow read: if true;")
rules = rules.replace("match /globalChat/{messageId} {\n      allow read: if isSignedIn();", "match /globalChat/{messageId} {\n      allow read: if true;")

# Add messages collection for room chats
if "match /messages/{messageId}" not in rules:
    messages_rules = """
    // Room Chats (Game Chat)
    match /messages/{messageId} {
      allow read: if true;
      allow create: if isSignedIn() && incoming().uid == request.auth.uid;
      allow update, delete: if false;
    }
"""
    rules = rules.replace("  }\n}", messages_rules + "  }\n}")

with open("firestore.rules", "w") as f:
    f.write(rules)
