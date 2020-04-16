# Findings about css-in-js

## My goal

Must haves

1. specify styling inline without wrapping components, or separate css files
2. support :hover etc seamlessly
3. acceptable performance (maybe component memoization is enough for this)
4. hot reload works
5. support for a theme containing colours, spacing values, etc
6. some means of supporting multiple themes, even if it requires reloading the app

Nice to have

1. theme is dynamic and can be changed at runtime (in practice, I probably won't use this)

## Emotion

supports the excellent `css` prop, which can be given an object, or a function accepting the theme as an argument

### Performance and optimisations

With the babel-plugin-emotion transform, it will try to hoist the css value into a variable to avoid recomputing css.

But this doesn't seem to work if the css is a function or function call, only if it's a plain object.
This means that the hoisting optimisation isn't compatible with theming (unless the theme is static).

Is this a problem? well, maybe with memoization I don't care about generating css on every render. But it seems sad :(

## Theme UI

This adds the `sx` prop, which is like emotion's `css` prop but also supports

1. automatically inserting from theme
2. responsive values as arrays

The library also adds loads of other stuff, including components, which I'm unsure if I want...

I could probably implement the bits of `sx` that I like myself as a function to use with emotion's css prop

## Linaria

All css is generated at build time.

Prop dependencies are possible through css variables but `styled.` notation is required and it's all a bit cumbersome.

## A rethink

Requierements: I only need colours to be dynamic. sizes etc don't need to be.
I can probably use CSS custom properties (var) for this... and for the time being I don't need it at all

So what if I:

1. Use linaria to specify css, which ensures it'll be computed at build time
2. write a little wrapper function that supports shorthands, responsives etc as I wish
3. later, turn theme imports into var lookups

roughly I want to write

    <div className={css({padding: SPACE2, color: PRIMARY})} />

and have `SPACE2` replaced with `var("--SPACE2")` where this is something like `2px`
