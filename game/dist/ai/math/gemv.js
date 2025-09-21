export function gemv(out, mat, vec, rows, cols) {
    for (let r = 0; r < rows; r++) {
        let sum = 0;
        for (let c = 0; c < cols; c++) {
            sum += mat[r * cols + c] * vec[c];
        }
        out[r] = sum;
    }
}
