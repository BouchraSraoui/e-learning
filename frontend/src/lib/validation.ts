import { z } from 'zod';

type T = (key: string) => string;

export function loginSchema(t: T) {
  return z.object({
    email: z
      .string()
      .min(1, t('emailRequired'))
      .email(t('emailInvalid')),
    password: z.string().min(1, t('passwordRequired')),
    keepSignedIn: z.boolean().optional(),
  });
}
export type LoginValues = z.infer<ReturnType<typeof loginSchema>>;

export function registerSchema(t: T) {
  return z.object({
    fullName: z.string().trim().min(1, t('nameRequired')),
    email: z
      .string()
      .min(1, t('emailRequired'))
      .email(t('emailInvalid')),
    departmentId: z.string().optional(),
    password: z.string().min(8, t('passwordMin')),
  });
}
export type RegisterValues = z.infer<ReturnType<typeof registerSchema>>;

export function forgotPasswordSchema(t: T) {
  return z.object({
    email: z
      .string()
      .min(1, t('emailRequired'))
      .email(t('emailInvalid')),
  });
}
export type ForgotPasswordValues = z.infer<ReturnType<typeof forgotPasswordSchema>>;

export function resetPasswordSchema(t: T) {
  return z
    .object({
      password: z.string().min(8, t('passwordMin')),
      confirmPassword: z.string().min(1, t('passwordRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('passwordsMismatch'),
      path: ['confirmPassword'],
    });
}
export type ResetPasswordValues = z.infer<ReturnType<typeof resetPasswordSchema>>;

export function profileSchema(t: T) {
  return z.object({
    firstName: z.string().trim().min(1, t('nameRequired')),
    lastName: z.string().trim().min(1, t('nameRequired')),
    jobTitle: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    location: z.string().trim().optional(),
    bio: z.string().trim().max(280).optional(),
  });
}
export type ProfileValues = z.infer<ReturnType<typeof profileSchema>>;
