// https://pomb.us/build-your-own-react/
// https://nanojsx.github.io/docs.html

type JsxElement = {
    type: string | ((props: unknown) => JsxElement);
    props: {
        nodeValue?: string;
        children: JsxElement[];
    };
};

// JsxFactory
function createElement(type: string, props: unknown, ...children: JsxElement[]): JsxElement {
    return {
        type,
        props: {
            ...(props as Record<string, unknown>),
            children: children.map((child) =>
                typeof child === "object" ? child : createTextElement(child)
            ),
        },
    };
}

function createTextElement(text: string): JsxElement {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: [],
        },
    };
}

const isProperty = (key: string) => key !== "children";

function render(element: JsxElement, container: HTMLElement | Text | null): void {
    if (!container) return;

    // If element.type is "function" it means that it comes from the jsx parser
    // and it needs to be called to get the actual element(s)
    const el = typeof element.type === "function" ? element.type(element.props) : element;
    const dom =
        element.type == "TEXT_ELEMENT"
            ? document.createTextNode("")
            : document.createElement(el.type as string);

    // Attach attributes
    Object.keys(element.props || {})
        .filter(isProperty)
        .forEach((name) => {
            // @ts-expect-error hard to type this
            dom[name] = el.props[name];
        });

    // Recursively render child elements
    el.props.children.forEach((child: JsxElement) => render(child, dom));

    container.appendChild(dom);
}

export default {
    createElement,
    render,
};
