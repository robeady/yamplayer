const defaultAlphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

export class IdSequence {
    private digits: number[] = []
    constructor(private alphabet = defaultAlphabet) {}

    next() {
        this.increment()
        return this.print()
    }

    private increment() {
        for (let i = 0; i < this.digits.length; i++) {
            if (this.digits[i] === this.alphabet.length - 1) {
                this.digits[i] = 0
            } else {
                this.digits[i]++
                return
            }
        }
        // if we get here, we have a carry, so add a new digit
        this.digits.push(0)
    }

    private print() {
        let printed = ""
        // print in big endian fashion
        for (let i = this.digits.length - 1; i >= 0; i--) {
            printed += this.alphabet[this.digits[i]]
        }
        return printed
    }
}
