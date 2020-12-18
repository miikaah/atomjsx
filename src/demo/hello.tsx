import Atom from "../";

const App = (props: { name: string }) => (
    <h1>
        <span>Hello from {props.name}!</span>
    </h1>
);

Atom.render(<App name="Atom" />, document.getElementById("root"));
