// completely forgot why we do this...
declare module "*.svg" {
    const component: React.ComponentType<React.SVGProps<SVGSVGElement>>
    export default component
}
