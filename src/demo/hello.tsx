import Atom, { useState } from "../";

const App = (props: { name: string }) => {
    const [counter, setCount] = useState<number>(1);
    return (
        <h1>
            <span>
                Hello from {props.name} times {counter}!
            </span>
            <button onClick={() => setCount((c) => c + 1)}>Increment</button>
        </h1>
    );
};

Atom.render(<App name="Atom" />, document.getElementById("root"));
