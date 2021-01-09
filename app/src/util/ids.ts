const defaultAlphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

/** Create an ID sequence, */
export function idSequence({ alphabet = defaultAlphabet } = {}) {
    const digits: number[] = []
    const maxDigit = alphabet.length - 1
    const getNextId = () => {
        let i = digits.length
        while (--i >= 0) {
            if (digits[i] === maxDigit) {
                digits[i] = 0
            } else {
                digits[i]++
                break
            }
        }
        if (i < 0) {
            // we didn't break early, so we need to carry over by inserting a new digit
            digits.unshift(0)
        }
        let s = ""
        for (const digit of digits) {
            s += alphabet[digit]
        }
        return s
    }
    return getNextId
}
