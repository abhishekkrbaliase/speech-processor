/**
 * Context-Aware Speech Manager
 * Dynamically adjusts Google Speech contexts based on expected response type
 */

import { Question } from '../shared/types';

export interface SpeechContextConfig {
  phrases: string[];
  boost: number;
}

export interface ContextAwareSpeechContexts {
  speechContexts: SpeechContextConfig[];
  model?: string;
  useEnhanced?: boolean;
}

// Extended response types for CSV-driven contexts
export type ExtendedResponseType = 'yes_no' | 'date_time' | 'not_applicable' | 'any' | 'numeric' | 'text' | 'multiple_choice';

export interface CSVQuestionContext {
  questionId: string;
  expectedResponseType: ExtendedResponseType;
  customPhrases?: string[]; // Optional custom phrases from CSV
  customBoost?: number; // Optional custom boost value from CSV
}

export class ContextAwareSpeechManager {
  
  /**
   * Generate optimized speech contexts based on question's expected response type
   */
  static generateContextsForQuestion(question: Question): ContextAwareSpeechContexts {
    const baseContexts: SpeechContextConfig[] = [];
    
    switch (question.expectedResponseType) {
      case 'yes_no':
        return this.generateYesNoContexts();
        
      case 'date_time':
        return this.generateDateTimeContexts();
        
      case 'not_applicable':
        return this.generateNotApplicableContexts();
        
      case 'any':
        return this.generateOpenEndedContexts();
        
      default:
        return this.generateDefaultContexts();
    }
  }

  /**
   * Generate optimized speech contexts for extended response types (CSV-driven)
   */
  static generateContextsForExtendedType(responseType: ExtendedResponseType, customPhrases?: string[], customBoost?: number): ContextAwareSpeechContexts {
    switch (responseType) {
      case 'yes_no':
        return this.generateYesNoContexts();
        
      case 'date_time':
        return this.generateDateTimeContexts();
        
      case 'not_applicable':
        return this.generateNotApplicableContexts();
        
      case 'any':
        return this.generateOpenEndedContexts();
        
      case 'numeric':
        return this.generateNumericContexts(customPhrases, customBoost);
        
      case 'text':
        return this.generateTextContexts(customPhrases, customBoost);
        
      case 'multiple_choice':
        return this.generateMultipleChoiceContexts(customPhrases, customBoost);
        
      default:
        return this.generateDefaultContexts();
    }
  }
  
  /**
   * Generate contexts optimized for Yes/No questions
   */
  private static generateYesNoContexts(): ContextAwareSpeechContexts {
    return {
      speechContexts: [
        // HIGHEST PRIORITY: Yes responses
        {
          phrases: [
            'yes', 'yeah', 'yep', 'yup', 'yah', 'ya', 'aye', 'ay',
            'affirmative', 'correct', 'right', 'true', 'accurate',
            'absolutely', 'definitely', 'certainly', 'of course', 'sure', 'surely',
            'ok', 'okay', 'alright', 'all right', 'very well', 'indeed',
            'positive', 'confirmed', 'agreed', 'exactly', 'precisely',
            'that\'s right', 'that is right', 'that\'s correct', 'that is correct'
          ],
          boost: 25.0 // Very high boost for yes/no questions
        },
        // HIGHEST PRIORITY: No responses
        {
          phrases: [
            'no', 'nope', 'nah', 'nay', 'negative', 'negatory',
            'incorrect', 'wrong', 'false', 'inaccurate', 'untrue',
            'never', 'not at all', 'absolutely not', 'definitely not',
            'certainly not', 'of course not', 'not really', 'not quite',
            'that\'s wrong', 'that is wrong', 'that\'s incorrect', 'that is incorrect'
          ],
          boost: 25.0 // Very high boost for yes/no questions
        }
      ],
      model: 'command_and_search', // Optimized for short responses
      useEnhanced: true
    };
  }
  
  /**
   * Generate contexts optimized for Date/Time questions
   */
  private static generateDateTimeContexts(): ContextAwareSpeechContexts {
    return {
      speechContexts: [
        // HIGHEST PRIORITY: Month names
        {
          phrases: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
            'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec'
          ],
          boost: 25.0
        },
        // HIGHEST PRIORITY: Ordinal numbers for dates
        {
          phrases: [
            // Written ordinals
            'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
            'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 
            'eighteenth', 'nineteenth', 'twentieth', 'twenty first', 'twenty second', 'twenty third', 
            'twenty fourth', 'twenty fifth', 'twenty sixth', 'twenty seventh', 'twenty eighth', 
            'twenty ninth', 'thirtieth', 'thirty first',
            
            // Numeric ordinals
            '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
            '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th',
            '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th', '30th', '31st'
          ],
          boost: 25.0
        },
        // HIGH PRIORITY: Year patterns (general)
        {
          phrases: [
            // Year components
            'nineteen', 'twenty', 'two thousand', 'two thousand and',
            'ninety', 'eighty', 'seventy', 'sixty', 'fifty',
            
            // Compound year patterns (your specific issue)
            'twentyfive', 'twenty five', 'twenty-five',
            'twentyfour', 'twenty four', 'twenty-four',
            'twentysix', 'twenty six', 'twenty-six',
            'twentyseven', 'twenty seven', 'twenty-seven',
            
            // Complex compound patterns
            'two thousand twentyfive', 'two thousand twenty five', 'two thousand twenty-five',
            'two thousand twentyfour', 'two thousand twenty four', 'two thousand twenty-four'
          ],
          boost: 20.0
        },
        // MEDIUM PRIORITY: Time patterns
        {
          phrases: [
            'AM', 'PM', 'a.m.', 'p.m.', 'o\'clock',
            'in the morning', 'in the afternoon', 'in the evening',
            'morning', 'afternoon', 'evening', 'night'
          ],
          boost: 15.0
        }
      ],
      model: 'latest_short', // Good balance for date recognition
      useEnhanced: true
    };
  }
  
  /**
   * Generate contexts optimized for Not Applicable responses
   */
  private static generateNotApplicableContexts(): ContextAwareSpeechContexts {
    return {
      speechContexts: [
        // HIGHEST PRIORITY: Not applicable responses
        {
          phrases: [
            'not applicable', 'N/A', 'not relevant', 'doesn\'t apply', 'does not apply',
            'skip', 'pass', 'ignore', 'not sure', 'unsure',
            'don\'t know', 'do not know', 'unknown', 'unclear', 'not available',
            'none', 'nothing', 'never', 'not really'
          ],
          boost: 25.0
        },
        // MEDIUM PRIORITY: Yes/No (in case user gives binary response)
        {
          phrases: [
            'yes', 'no', 'yeah', 'nope', 'yep', 'nah'
          ],
          boost: 15.0
        }
      ],
      model: 'command_and_search',
      useEnhanced: true
    };
  }
  
  /**
   * Generate contexts for open-ended questions
   */
  private static generateOpenEndedContexts(): ContextAwareSpeechContexts {
    return {
      speechContexts: [
        // LOW PRIORITY: Common response starters
        {
          phrases: [
            'I think', 'I believe', 'I feel', 'I would say',
            'probably', 'maybe', 'perhaps', 'possibly',
            'usually', 'sometimes', 'often', 'rarely', 'never', 'always'
          ],
          boost: 10.0
        }
      ],
      model: 'latest_long', // Better for longer responses
      useEnhanced: true
    };
  }
  
  /**
   * Generate default contexts when type is unknown
   */
  private static generateDefaultContexts(): ContextAwareSpeechContexts {
    return {
      speechContexts: [
        // Balanced contexts for unknown response types
        {
          phrases: [
            'yes', 'no', 'yeah', 'nope', 'not applicable', 'N/A'
          ],
          boost: 15.0
        }
      ],
      model: 'latest_short',
      useEnhanced: true
    };
  }
  
  /**
   * Generate contexts optimized for Numeric responses
   */
  private static generateNumericContexts(customPhrases?: string[], customBoost?: number): ContextAwareSpeechContexts {
    const baseNumericPhrases = [
      // Numbers 0-100
      'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
      'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred',
      
      // Common numeric patterns
      'point', 'decimal', 'dot', 'percent', 'percentage',
      'half', 'quarter', 'third', 'double', 'triple',
      
      // Numeric expressions
      'approximately', 'about', 'around', 'roughly', 'exactly',
      'more than', 'less than', 'at least', 'at most', 'between'
    ];

    const phrases = customPhrases ? [...baseNumericPhrases, ...customPhrases] : baseNumericPhrases;
    const boost = customBoost || 20.0;

    return {
      speechContexts: [
        {
          phrases,
          boost
        },
        // Include basic yes/no as fallback
        {
          phrases: ['yes', 'no', 'yeah', 'nope', 'not applicable', 'N/A'],
          boost: 10.0
        }
      ],
      model: 'command_and_search', // Good for short numeric responses
      useEnhanced: true
    };
  }

  /**
   * Generate contexts optimized for Text/Open responses
   */
  private static generateTextContexts(customPhrases?: string[], customBoost?: number): ContextAwareSpeechContexts {
    const baseTextPhrases = [
      // Common response starters
      'I think', 'I believe', 'I feel', 'I would say', 'In my opinion',
      'probably', 'maybe', 'perhaps', 'possibly', 'definitely',
      'usually', 'sometimes', 'often', 'rarely', 'never', 'always',
      
      // Medical/health context
      'pain', 'discomfort', 'symptoms', 'medication', 'treatment',
      'doctor', 'hospital', 'clinic', 'appointment', 'prescription',
      
      // Common descriptors
      'mild', 'moderate', 'severe', 'chronic', 'acute', 'occasional',
      'better', 'worse', 'same', 'improving', 'worsening',
      
      // Time references
      'recently', 'lately', 'yesterday', 'today', 'tomorrow',
      'morning', 'afternoon', 'evening', 'night'
    ];

    const phrases = customPhrases ? [...baseTextPhrases, ...customPhrases] : baseTextPhrases;
    const boost = customBoost || 15.0;

    return {
      speechContexts: [
        {
          phrases,
          boost
        }
      ],
      model: 'latest_long', // Better for longer text responses
      useEnhanced: true
    };
  }

  /**
   * Generate contexts optimized for Multiple Choice responses
   */
  private static generateMultipleChoiceContexts(customPhrases?: string[], customBoost?: number): ContextAwareSpeechContexts {
    const baseChoicePhrases = [
      // Option indicators
      'option A', 'option B', 'option C', 'option D', 'option E',
      'choice A', 'choice B', 'choice C', 'choice D', 'choice E',
      'first option', 'second option', 'third option', 'fourth option', 'fifth option',
      'A', 'B', 'C', 'D', 'E',
      
      // Selection language
      'I choose', 'I select', 'I pick', 'my answer is', 'the answer is',
      'that would be', 'I would say', 'I think it\'s',
      
      // Common multiple choice answers
      'all of the above', 'none of the above', 'not sure', 'don\'t know'
    ];

    const phrases = customPhrases ? [...baseChoicePhrases, ...customPhrases] : baseChoicePhrases;
    const boost = customBoost || 22.0;

    return {
      speechContexts: [
        {
          phrases,
          boost
        },
        // Include yes/no as fallback for confirmation
        {
          phrases: ['yes', 'no', 'correct', 'right', 'wrong'],
          boost: 15.0
        }
      ],
      model: 'command_and_search', // Good for short choice responses
      useEnhanced: true
    };
  }

  /**
   * Get context summary for debugging
   */
  static getContextSummary(question: Question): string {
    const contexts = this.generateContextsForQuestion(question);
    const totalPhrases = contexts.speechContexts.reduce((sum, ctx) => sum + ctx.phrases.length, 0);
    const maxBoost = Math.max(...contexts.speechContexts.map(ctx => ctx.boost));
    
    return `Type: ${question.expectedResponseType}, Contexts: ${contexts.speechContexts.length}, Phrases: ${totalPhrases}, Max Boost: ${maxBoost}, Model: ${contexts.model}`;
  }

  /**
   * Get extended context summary for CSV-driven contexts
   */
  static getExtendedContextSummary(responseType: ExtendedResponseType, customPhrases?: string[], customBoost?: number): string {
    const contexts = this.generateContextsForExtendedType(responseType, customPhrases, customBoost);
    const totalPhrases = contexts.speechContexts.reduce((sum, ctx) => sum + ctx.phrases.length, 0);
    const maxBoost = Math.max(...contexts.speechContexts.map(ctx => ctx.boost));
    
    return `Type: ${responseType}, Contexts: ${contexts.speechContexts.length}, Phrases: ${totalPhrases}, Max Boost: ${maxBoost}, Model: ${contexts.model}`;
  }
}