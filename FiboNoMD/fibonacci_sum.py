def fibonacci_sum(count):
    a, b = 0, 1
    total = 0
    for _ in range(count):
        total += a
        a, b = b, a + b
    return total


if __name__ == "__main__":
    print(fibonacci_sum(100))
