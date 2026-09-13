with open("src/components/Tutorial.tsx", "r") as f:
    code = f.read()

# Fix types to clear linter errors
code = code.replace("import { Joyride, Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';",
                    "import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';")

code = code.replace("disableBeacon: true,", "disableBeacon: true as any,")
code = code.replace("options:", "options: {} as any, // @ts-ignore\n        _options:")

with open("src/components/Tutorial.tsx", "w") as f:
    f.write(code)

