import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Converte um valor de data (Date ou string ISO/br) para objeto Date com horário normalizado para 00:00:00.
 */
export function normalizeToMidnight(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof value === 'string' && value.trim()) {
    // Formato ISO: YYYY-MM-DD
    if (value.includes('-')) {
      const [year, month, day] = value.split('T')[0].split('-').map(Number);
      if (year && month && day) {
        const d = new Date(year, month - 1, day);
        d.setHours(0, 0, 0, 0);
        return d;
      }
    }
    // Formato BR: DD/MM/YYYY
    if (value.includes('/')) {
      const [day, month, year] = value.split('/').map(Number);
      if (year && month && day) {
        const d = new Date(year, month - 1, day);
        d.setHours(0, 0, 0, 0);
        return d;
      }
    }
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
  return null;
}

/**
 * Validador que impede a seleção de datas futuras (maiores que a data de hoje).
 */
export function maxDateTodayValidator(
  errorMessage: string = 'A data não pode ser posterior a hoje'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null;

    const inputDate = normalizeToMidnight(val);
    if (!inputDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (inputDate.getTime() > today.getTime()) {
      return { dataFutura: { message: errorMessage } };
    }
    return null;
  };
}


/**
 * Validador para formulários que possuem dois campos de data e exigem que
 * a data posterior (`targetControlName`) seja maior ou igual à data anterior (`earlierControlName`).
 */
export function dateSequenceValidator(
  earlierControlName: string,
  targetControlName: string,
  errorKey: string,
  errorMessage?: string
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const group = control as FormGroup;
    if (!group || !group.controls) return null;

    const earlierControl = group.controls[earlierControlName];
    const targetControl = group.controls[targetControlName];

    if (!earlierControl || !targetControl) return null;

    const earlierDate = normalizeToMidnight(earlierControl.value);
    const targetDate = normalizeToMidnight(targetControl.value);

    // Se qualquer um dos dois não estiver preenchido, limpa o erro específico
    if (!earlierDate || !targetDate) {
      if (targetControl.errors && targetControl.errors[errorKey]) {
        const errors = { ...targetControl.errors };
        delete errors[errorKey];
        targetControl.setErrors(Object.keys(errors).length ? errors : null);
      }
      return null;
    }

    if (targetDate.getTime() < earlierDate.getTime()) {
      const currentErrors = targetControl.errors || {};
      targetControl.setErrors({
        ...currentErrors,
        [errorKey]: errorMessage ? { message: errorMessage } : true,
      });
      return { [errorKey]: true };
    } else {
      // Se a data agora é válida, remove apenas este erro da lista de erros do controle alvo
      if (targetControl.errors && targetControl.errors[errorKey]) {
        const errors = { ...targetControl.errors };
        delete errors[errorKey];
        targetControl.setErrors(Object.keys(errors).length ? errors : null);
      }
    }

    return null;
  };
}

/**
 * Validador de FormControl individual comparando contra uma data base fixa/dinâmica (ex: data de nascimento do pet).
 */
export function dateNotBeforeDateValidator(
  getBaseDate: () => unknown,
  errorKey: string = 'dataAntesNascimento',
  errorMessage: string = 'A data não pode ser anterior ao nascimento do animal'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null;

    const inputDate = normalizeToMidnight(val);
    const baseDate = normalizeToMidnight(getBaseDate());

    if (!inputDate || !baseDate) return null;

    if (inputDate.getTime() < baseDate.getTime()) {
      return { [errorKey]: { message: errorMessage } };
    }

    return null;
  };
}
