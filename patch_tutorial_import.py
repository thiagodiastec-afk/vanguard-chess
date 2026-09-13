with open("src/components/Tutorial.tsx", "r") as f:
    code = f.read()

code = code.replace("import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';",
                    "import { Joyride, Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';")

with open("src/components/Tutorial.tsx", "w") as f:
    f.write(code)

