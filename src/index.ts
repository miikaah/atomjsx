// https://pomb.us/build-your-own-react/
// https://nanojsx.github.io/docs.html

type JsxFunction = (props: unknown) => JsxElement;

type JsxElement = {
    type: string | JsxFunction;
    props: {
        nodeValue?: string | EventListenerOrEventListenerObject;
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

type Props = {
    [x: string]: string | JsxElement[] | EventListenerOrEventListenerObject | undefined;
    children: JsxElement[];
};

type Fiber = {
    type: string | JsxFunction;
    props: Props;
    parent: Fiber | null;
    child: Fiber | null;
    sibling: Fiber | null;
    dom?: HTMLElement | Text | null;
    alternate: Fiber | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hooks?: Hook<any>[];
    effectTag: "PLACEMENT" | "UPDATE" | "DELETION" | "ROOT";
};

type FiberWithJsxFunction = Omit<Fiber, "type"> & { type: JsxFunction };

function createDom(fiber: Fiber) {
    const dom =
        fiber.type == "TEXT_ELEMENT"
            ? document.createTextNode("")
            : document.createElement(fiber.type as string);

    updateDom(dom, { children: [] }, fiber.props);

    return dom;
}

const isEvent = (key: string) => key.startsWith("on");
const isProperty = (key: string) => key !== "children" && !isEvent(key);
const isNew = (prev: Props, next: Props) => (key: string) => prev[key] !== next[key];
const isGone = (_prev: Props, next: Props) => (key: string) => !(key in next);

function updateDom(dom: Text | HTMLElement, prevProps: Props, nextProps: Props) {
    //Remove old or changed event listeners
    Object.keys(prevProps || {})
        .filter(isEvent)
        .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
        .forEach((name) => {
            const eventType = name.toLowerCase().substring(2);
            dom.removeEventListener(
                eventType,
                prevProps[name] as EventListenerOrEventListenerObject
            );
        });

    // Remove old properties
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach((name) => {
            // @ts-expect-error don't know how to type this
            dom[name] = "";
        });

    // Set new or changed properties
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach((name) => {
            // @ts-expect-error don't know how to type this
            dom[name] = nextProps[name];
        });

    // Add event listeners
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach((name) => {
            const eventType = name.toLowerCase().substring(2);
            dom.addEventListener(eventType, nextProps[name] as EventListenerOrEventListenerObject);
        });
}

function commitRoot() {
    deletions?.forEach(commitWork);
    commitWork(wipRoot?.child);
    currentRoot = wipRoot;
    wipRoot = null;
}

function commitWork(fiber: Fiber | undefined | null) {
    if (!fiber) {
        return;
    }

    let domParentFiber = fiber.parent;
    while (!domParentFiber?.dom) {
        domParentFiber = domParentFiber?.parent || null;
    }
    const domParent = domParentFiber.dom;

    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
        domParent.appendChild(fiber.dom);
    } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
        updateDom(fiber.dom, fiber.alternate?.props || { children: [] }, fiber.props);
    } else if (fiber.effectTag === "DELETION") {
        commitDeletion(fiber, domParent as HTMLElement);
    }

    commitWork(fiber.child);
    commitWork(fiber.sibling);
}

function commitDeletion(fiber: Fiber | undefined | null, domParent: HTMLElement) {
    if (fiber?.dom) {
        domParent.removeChild(fiber.dom);
    } else {
        commitDeletion(fiber?.child, domParent);
    }
}

function render(element: JsxElement, container: HTMLElement | null): void {
    wipRoot = {
        dom: container,
        props: {
            children: [element],
        },
        alternate: currentRoot,
        type: "",
        effectTag: "ROOT",
        parent: null,
        child: null,
        sibling: null,
    };
    deletions = [];
    nextUnitOfWork = wipRoot;
}

let nextUnitOfWork: Fiber | undefined | null = null;
let currentRoot: Fiber | null = null;
let wipRoot: Fiber | null = null;
let deletions: Fiber[] = [];

type IdleDeadline = {
    timeRemaining: () => DOMHighResTimeStamp;
};

function workLoop(deadline: IdleDeadline) {
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
        shouldYield = deadline.timeRemaining() < 1;
    }

    if (!nextUnitOfWork && wipRoot) {
        commitRoot();
    }

    // @ts-expect-error not in Safari yet
    requestIdleCallback(workLoop);
}

// @ts-expect-error not in Safari yet
requestIdleCallback(workLoop);

function performUnitOfWork(fiber: Fiber): Fiber | undefined | null {
    const isFunctionComponent = fiber.type instanceof Function;
    if (isFunctionComponent) {
        updateFunctionComponent(fiber as FiberWithJsxFunction);
    } else {
        updateHostComponent(fiber);
    }
    if (fiber.child) {
        return fiber.child;
    }
    let nextFiber: Fiber | null = fiber;
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling;
        }
        nextFiber = nextFiber.parent;
    }
}

let wipFiber: Fiber | null = null;
let hookIndex = 0;

function updateFunctionComponent(fiber: FiberWithJsxFunction) {
    wipFiber = fiber;
    hookIndex = 0;
    wipFiber.hooks = [];
    const children = [fiber.type(fiber.props)];
    reconcileChildren(fiber, children);
}

function updateHostComponent(fiber: Fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber);
    }
    reconcileChildren(fiber, fiber.props.children);
}

function reconcileChildren(wipFiber: Fiber, elements: JsxElement[]) {
    let index = 0;
    let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
    let prevSibling: Fiber | null = null;

    while (index < elements.length || oldFiber != null) {
        const element = elements[index];
        let newFiber: Fiber | null = null;

        const sameType = oldFiber && element && element.type == oldFiber.type;

        if (sameType) {
            newFiber = {
                type: oldFiber?.type || "",
                props: element.props,
                dom: oldFiber?.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: "UPDATE",
                child: null,
                sibling: null,
            };
        }
        if (element && !sameType) {
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: "PLACEMENT",
                child: null,
                sibling: null,
            };
        }
        if (oldFiber && !sameType) {
            oldFiber.effectTag = "DELETION";
            deletions.push(oldFiber);
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling;
        }

        if (index === 0) {
            wipFiber.child = newFiber;
        } else if (element && prevSibling) {
            prevSibling.sibling = newFiber;
        }

        prevSibling = newFiber;
        index++;
    }
}

type Hook<T> = {
    state: T;
    queue: Action<T>[];
};

type Action<T> = (state: T) => T;
type VoidAction<T> = (action: Action<T>) => void;

export function useState<T>(initial: T): [T, VoidAction<T>] {
    const oldHook = wipFiber?.alternate?.hooks?.[hookIndex];
    const hook: Hook<T> = {
        state: oldHook ? oldHook.state : initial,
        queue: [],
    };

    const actions = oldHook ? oldHook.queue : [];
    actions.forEach((action: Action<T>) => {
        hook.state = action(hook.state);
    });

    const setState = (action: Action<T>) => {
        hook.queue.push(action);
        wipRoot = {
            dom: currentRoot?.dom,
            props: currentRoot?.props || { children: [] },
            alternate: currentRoot,
            type: "",
            parent: null,
            effectTag: "ROOT",
            child: null,
            sibling: null,
        };
        nextUnitOfWork = wipRoot;
        deletions = [];
    };

    wipFiber?.hooks?.push(hook);
    hookIndex++;
    return [hook.state, setState];
}

export default {
    createElement,
    render,
};
