import TemplateEngine, {
  DEFAULT_TEMPLATES
} from '../../src/modules/notifications/templates/template.engine.js';
import { SupportedLanguages } from '../../src/modules/notifications/constants/notification.constants.js';

describe('TemplateEngine Unit Tests', () => {
  describe('HTML Escaping', () => {
    it('should escape malicious script tags and HTML characters', () => {
      const malicious = '<script>alert("xss")</script> & "foo" \'bar\'';
      const escaped = TemplateEngine.escapeHtml(malicious);
      expect(escaped).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;foo&quot; &#39;bar&#39;'
      );
    });

    it('should handle null, undefined, or empty values safely', () => {
      expect(TemplateEngine.escapeHtml(null)).toBe('');
      expect(TemplateEngine.escapeHtml(undefined)).toBe('');
      expect(TemplateEngine.escapeHtml('')).toBe('');
    });
  });

  describe('Template Rendering', () => {
    it('should replace dynamic variables correctly in text', () => {
      const template = 'Hello {{name}}, your booking reference is {{ref}}!';
      const result = TemplateEngine.render(template, { name: 'John Doe', ref: 'BK-12345' });
      expect(result).toBe('Hello John Doe, your booking reference is BK-12345!');
    });

    it('should automatically escape variables when isHtml is true', () => {
      const template = '<p>Hello {{name}}</p>';
      const result = TemplateEngine.render(template, { name: '<b>Alice</b>' }, true);
      expect(result).toBe('<p>Hello &lt;b&gt;Alice&lt;/b&gt;</p>');
    });

    it('should allow raw unescaped values when triple braces {{{raw}}} are used', () => {
      const template = '<div>{{{rawHtml}}}</div>';
      const result = TemplateEngine.render(
        template,
        { rawHtml: '<strong>Important</strong>' },
        true
      );
      expect(result).toBe('<div><strong>Important</strong></div>');
    });

    it('should replace missing or undefined variables with empty string', () => {
      const template = 'Hello {{name}}, your balance is {{balance}}';
      const result = TemplateEngine.render(template, { name: 'Bob' });
      expect(result).toBe('Hello Bob, your balance is ');
    });
  });

  describe('Variable Validation', () => {
    it('should pass when all required variables are present', () => {
      const required = ['name', 'ref', 'amount'];
      const data = { name: 'Alice', ref: 'BK-001', amount: 500 };
      const outcome = TemplateEngine.validateVariables(required, data);
      expect(outcome.valid).toBe(true);
      expect(outcome.missing).toEqual([]);
    });

    it('should fail and return list of missing variables when required fields are missing', () => {
      const required = ['name', 'ref', 'amount', 'ticketUrl'];
      const data = { name: 'Alice', amount: 500 };
      const outcome = TemplateEngine.validateVariables(required, data);
      expect(outcome.valid).toBe(false);
      expect(outcome.missing).toEqual(['ref', 'ticketUrl']);
    });
  });

  describe('Default Templates and Localization', () => {
    it('should return English default template for BOOKING_CONFIRMED:EMAIL:en', () => {
      const tpl = TemplateEngine.getDefaultTemplate(
        'BOOKING_CONFIRMED',
        'EMAIL',
        SupportedLanguages.EN
      );
      expect(tpl).toBeDefined();
      expect(tpl.subject).toContain('{{bookingReference}}');
      expect(tpl.bodyTemplate).toContain('Ticket Confirmation');
    });

    it('should return Hindi default template when requested', () => {
      const tpl = TemplateEngine.getDefaultTemplate(
        'BOOKING_CONFIRMED',
        'EMAIL',
        SupportedLanguages.HI
      );
      expect(tpl).toBeDefined();
      expect(tpl.subject).toContain('आपका मूवी टिकट कन्फर्म');
    });

    it('should fall back to English if an unsupported language is requested', () => {
      const tpl = TemplateEngine.getDefaultTemplate('BOOKING_CONFIRMED', 'EMAIL', 'fr');
      expect(tpl).toBeDefined();
      expect(tpl.subject).toBe(DEFAULT_TEMPLATES['BOOKING_CONFIRMED:EMAIL:en'].subject);
    });
  });
});
