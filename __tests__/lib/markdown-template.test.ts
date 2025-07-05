import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadMarkdownTemplate } from '../../lib/markdown-template';
import * as fs from 'fs';
import * as path from 'path';

const TEST_TEMPLATES_DIR = path.join(__dirname, 'test-templates');

interface UserVariables {
  name: string;
  email: string;
  age: number;
}

interface ProductVariables {
  productName: string;
  price: number;
  discount: number;
  currency: string;
}

beforeAll(() => {
  if (!fs.existsSync(TEST_TEMPLATES_DIR)) {
    fs.mkdirSync(TEST_TEMPLATES_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(TEST_TEMPLATES_DIR, 'user-template.md'),
    '# Hello {{name}}!\n\nYour email is {{email}} and you are {{age}} years old.'
  );

  fs.writeFileSync(
    path.join(TEST_TEMPLATES_DIR, 'product-template.md'),
    '## {{productName}}\n\n**Price:** {{price}} {{currency}}\n**Discount:** {{discount}}%\n\nFinal Price: {{finalPrice}} {{currency}}'
  );

  fs.writeFileSync(
    path.join(TEST_TEMPLATES_DIR, 'empty-template.md'),
    ''
  );

  fs.writeFileSync(
    path.join(TEST_TEMPLATES_DIR, 'no-variables-template.md'),
    '# Static Content\n\nThis template has no variables to replace.'
  );

  fs.writeFileSync(
    path.join(TEST_TEMPLATES_DIR, 'special-chars-template.md'),
    '# {{title}}\n\n{{content}}\n\n---\n\n{{specialChars}}'
  );
});

afterAll(() => {
  if (fs.existsSync(TEST_TEMPLATES_DIR)) {
    fs.rmSync(TEST_TEMPLATES_DIR, { recursive: true, force: true });
  }
});

describe('loadMarkdownTemplate', () => {
  describe('successful template loading and variable replacement', () => {
    it('should load template and replace variables correctly', () => {
      const templatePath = path.join(TEST_TEMPLATES_DIR, 'user-template.md');
      const variables: UserVariables = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      const result = loadMarkdownTemplate(templatePath, variables);

      expect(result).toBe('# Hello John Doe!\n\nYour email is john@example.com and you are 30 years old.');
    });

    it('should handle complex variables with multiple types', () => {
      const templatePath = path.join(TEST_TEMPLATES_DIR, 'product-template.md');
      const variables: ProductVariables = {
        productName: 'Luxury Watch',
        price: 1000,
        discount: 20,
        currency: 'USD'
      };

      const result = loadMarkdownTemplate(templatePath, variables);

      expect(result).toContain('## Luxury Watch');
      expect(result).toContain('**Price:** 1000 USD');
      expect(result).toContain('**Discount:** 20%');
    });

    it('should handle templates with no variables', () => {
      const templatePath = path.join(TEST_TEMPLATES_DIR, 'no-variables-template.md');
      const variables = {};

      const result = loadMarkdownTemplate(templatePath, variables);

      expect(result).toBe('# Static Content\n\nThis template has no variables to replace.');
    });

    it('should handle empty templates', () => {
      const templatePath = path.join(TEST_TEMPLATES_DIR, 'empty-template.md');
      const variables = {};

      const result = loadMarkdownTemplate(templatePath, variables);

      expect(result).toBe('');
    });

    it('should handle special characters in variables (HTML-escaped)', () => {
      const templatePath = path.join(TEST_TEMPLATES_DIR, 'special-chars-template.md');
      const variables = {
        title: 'Title with "quotes" & symbols',
        content: 'Content with <tags> and & ampersands',
        specialChars: 'éñçödé châractërs'
      };

      const result = loadMarkdownTemplate(templatePath, variables);

      expect(result).toContain('Title with &quot;quotes&quot; &amp; symbols');
      expect(result).toContain('Content with &lt;tags&gt; and &amp; ampersands');
      expect(result).toContain('éñçödé châractërs');
    });

    it('should handle relative paths', () => {
      const relativePath = path.relative(process.cwd(), path.join(TEST_TEMPLATES_DIR, 'user-template.md'));
      const variables: UserVariables = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25
      };

      const result = loadMarkdownTemplate(relativePath, variables);

      expect(result).toBe('# Hello Jane Smith!\n\nYour email is jane@example.com and you are 25 years old.');
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent file', () => {
      const nonExistentPath = path.join(TEST_TEMPLATES_DIR, 'non-existent.md');
      const variables = { name: 'Test' };

      expect(() => {
        loadMarkdownTemplate(nonExistentPath, variables);
      }).toThrow('Failed to load markdown template:');
    });

    it('should throw error for invalid path', () => {
      const invalidPath = '/invalid/path/that/does/not/exist.md';
      const variables = { name: 'Test' };

      expect(() => {
        loadMarkdownTemplate(invalidPath, variables);
      }).toThrow('Failed to load markdown template:');
    });

    it('should handle directory path instead of file path', () => {
      const variables = { name: 'Test' };

      expect(() => {
        loadMarkdownTemplate(TEST_TEMPLATES_DIR, variables);
      }).toThrow('Failed to load markdown template:');
    });
  });

  describe('edge cases', () => {
    it('should handle variables with undefined values', () => {
      const templatePath = path.join(TEST_TEMPLATES_DIR, 'user-template.md');
      const variables = {
        name: 'John',
        email: undefined,
        age: 30
      };

      const result = loadMarkdownTemplate(templatePath, variables);

      expect(result).toContain('John');
      expect(result).toContain('30');
    });

    it('should handle variables with null values', () => {
      const templatePath = path.join(TEST_TEMPLATES_DIR, 'user-template.md');
      const variables = {
        name: 'John',
        email: null,
        age: 30
      };

      const result = loadMarkdownTemplate(templatePath, variables);

      expect(result).toContain('John');
      expect(result).toContain('30');
    });

    it('should handle variables with empty string values', () => {
      const templatePath = path.join(TEST_TEMPLATES_DIR, 'user-template.md');
      const variables: UserVariables = {
        name: '',
        email: 'test@example.com',
        age: 25
      };

      const result = loadMarkdownTemplate(templatePath, variables);

      expect(result).toContain('# Hello !');
      expect(result).toContain('test@example.com');
      expect(result).toContain('25');
    });

    it('should handle boolean and number variables', () => {
      fs.writeFileSync(
        path.join(TEST_TEMPLATES_DIR, 'mixed-types-template.md'),
        'Active: {{isActive}}\nCount: {{count}}\nRating: {{rating}}'
      );

      const variables = {
        isActive: true,
        count: 0,
        rating: 4.5
      };

      const result = loadMarkdownTemplate(
        path.join(TEST_TEMPLATES_DIR, 'mixed-types-template.md'),
        variables
      );

      expect(result).toContain('Active: true');
      expect(result).toContain('Count: 0');
      expect(result).toContain('Rating: 4.5');
    });
  });
});