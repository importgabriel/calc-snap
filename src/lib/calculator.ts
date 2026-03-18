export interface CalcEntry {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
}

export interface CalcResult {
  expression: string;
  result: string;
  error?: string;
}

/**
 * Safe calculator that evaluates mathematical expressions without using eval()
 * Supports: +, -, *, /, %, parentheses, and decimal numbers
 */
export class Calculator {
  private pos = 0;
  private expression = '';

  /**
   * Evaluate a mathematical expression safely
   */
  evaluate(expr: string): CalcResult {
    try {
      // Clean and validate the expression
      const cleanExpr = this.cleanExpression(expr);
      if (!cleanExpr) {
        return {
          expression: expr,
          result: '0',
          error: 'Empty expression'
        };
      }

      // Reset parser state
      this.expression = cleanExpr;
      this.pos = 0;

      // Parse and calculate
      const result = this.parseExpression();

      // Check if we consumed the entire expression
      if (this.pos < this.expression.length) {
        throw new Error('Invalid expression');
      }

      // Format the result
      const formattedResult = this.formatNumber(result);

      return {
        expression: cleanExpr,
        result: formattedResult
      };
    } catch (error) {
      return {
        expression: expr,
        result: 'Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clean and validate the input expression
   */
  private cleanExpression(expr: string): string {
    if (!expr || typeof expr !== 'string') return '';

    // Remove whitespace and validate characters
    const cleaned = expr.replace(/\s/g, '');
    const validChars = /^[0-9+\-*/.()%]*$/;

    if (!validChars.test(cleaned)) {
      throw new Error('Invalid characters in expression');
    }

    return cleaned;
  }

  /**
   * Parse expression with operator precedence (handles + and -)
   */
  private parseExpression(): number {
    let result = this.parseTerm();

    while (this.pos < this.expression.length) {
      const char = this.expression[this.pos];
      if (char === '+') {
        this.pos++;
        result += this.parseTerm();
      } else if (char === '-') {
        this.pos++;
        result -= this.parseTerm();
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Parse term (handles *, /, %)
   */
  private parseTerm(): number {
    let result = this.parseFactor();

    while (this.pos < this.expression.length) {
      const char = this.expression[this.pos];
      if (char === '*') {
        this.pos++;
        result *= this.parseFactor();
      } else if (char === '/') {
        this.pos++;
        const divisor = this.parseFactor();
        if (divisor === 0) {
          throw new Error('Division by zero');
        }
        result /= divisor;
      } else if (char === '%') {
        this.pos++;
        const divisor = this.parseFactor();
        if (divisor === 0) {
          throw new Error('Division by zero');
        }
        result %= divisor;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Parse factor (handles numbers, parentheses, and unary minus)
   */
  private parseFactor(): number {
    // Skip whitespace (shouldn't be any after cleaning, but just in case)
    while (this.pos < this.expression.length && this.expression[this.pos] === ' ') {
      this.pos++;
    }

    if (this.pos >= this.expression.length) {
      throw new Error('Unexpected end of expression');
    }

    const char = this.expression[this.pos];

    // Handle unary minus
    if (char === '-') {
      this.pos++;
      return -this.parseFactor();
    }

    // Handle unary plus
    if (char === '+') {
      this.pos++;
      return this.parseFactor();
    }

    // Handle parentheses
    if (char === '(') {
      this.pos++;
      const result = this.parseExpression();
      if (this.pos >= this.expression.length || this.expression[this.pos] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      this.pos++;
      return result;
    }

    // Parse number
    return this.parseNumber();
  }

  /**
   * Parse a number (integer or decimal)
   */
  private parseNumber(): number {
    const start = this.pos;
    let hasDecimalPoint = false;

    // Parse digits and decimal point
    while (this.pos < this.expression.length) {
      const char = this.expression[this.pos];

      if (char >= '0' && char <= '9') {
        this.pos++;
      } else if (char === '.' && !hasDecimalPoint) {
        hasDecimalPoint = true;
        this.pos++;
      } else {
        break;
      }
    }

    if (start === this.pos) {
      throw new Error('Expected number');
    }

    const numberStr = this.expression.substring(start, this.pos);
    const number = parseFloat(numberStr);

    if (isNaN(number)) {
      throw new Error('Invalid number');
    }

    return number;
  }

  /**
   * Format number for display
   */
  private formatNumber(num: number): string {
    if (!isFinite(num)) {
      throw new Error('Result is not a finite number');
    }

    // Handle very large or very small numbers
    if (Math.abs(num) >= 1e15 || (Math.abs(num) < 1e-10 && num !== 0)) {
      return num.toExponential(10);
    }

    // Round to avoid floating point precision issues
    const rounded = Math.round(num * 1e12) / 1e12;

    // Format with appropriate decimal places
    if (rounded === Math.floor(rounded)) {
      return rounded.toString();
    } else {
      return rounded.toString();
    }
  }
}

/**
 * Singleton calculator instance
 */
const calculator = new Calculator();

/**
 * Evaluate a mathematical expression
 */
export function evaluateExpression(expression: string): CalcResult {
  return calculator.evaluate(expression);
}

/**
 * Generate a unique ID for calculation entries
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}