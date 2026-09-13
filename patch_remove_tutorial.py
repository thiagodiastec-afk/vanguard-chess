with open("src/App.tsx", "r") as f:
    lines = f.readlines()

with open("src/App.tsx", "w") as f:
    for line in lines:
        if "<Tutorial" in line:
            continue
        if "import Tutorial" in line:
            continue
        f.write(line)

