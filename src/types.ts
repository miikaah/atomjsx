// This type makes Typescript shut up
/* eslint-disable-next-line */
declare namespace JSX {
    interface IntrinsicElements {
        /* eslint-disable-next-line */
        [elemName: string]: any;
    }
}
