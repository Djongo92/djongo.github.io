import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useI18n } from '@/lib/i18n';
import { useCreateEnquiry } from "@workspace/api-client-react";

// The join form, split from the membership page so the page text paints
// before the form library (zod, react-hook-form) has loaded.

const formSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactPerson: z.string().min(2, "Contact name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(6, "Phone number is required"),
  category: z.enum(["Patron", "Corporate", "Business", "Non-Profit"], { required_error: "Please select a category" }),
  message: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export default function MembershipForm() {
  const { t } = useI18n();
  const createEnquiry = useCreateEnquiry();
  
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      message: ""
    }
  });

  const onSubmit = (data: FormValues) => {
    setSubmitStatus('idle');
    createEnquiry.mutate({ data }, {
      onSuccess: (res: any) => {
        setReferenceId(res?.id?.toString() || Math.random().toString(36).substring(2, 10).toUpperCase());
        setSubmitStatus('success');
      },
      onError: () => {
        setSubmitStatus('error');
      }
    });
  };

  return (
    <>
                {submitStatus === 'success' ? (
                  <div className="bg-primary/5 border border-primary/20 p-8 text-center rounded-2xl">
                    <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h4 className="font-bold text-lg mb-2">{t('membership.form.success_title')}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{t('membership.form.success_desc')}</p>
                    <div className="bg-card py-2 px-4 rounded-sm border border-border inline-block text-sm font-mono font-bold text-foreground">
                      {t('membership.form.reference')}: #{referenceId}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
                    {submitStatus === 'error' && (
                      <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-sm font-bold text-destructive">{t('membership.form.error_title')}</h5>
                          <p className="text-xs text-destructive/80 mt-1">{t('membership.form.error_desc')}</p>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="join-companyName" className="text-sm font-semibold mb-1.5 block">{t('membership.form.company')}</label>
                      <input 
                        {...form.register("companyName")} id="join-companyName" type="text" autoComplete="organization" 
                        className="w-full border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        placeholder={t('membership.form.company_ph')}
                      />
                      {form.formState.errors.companyName && <span className="text-destructive text-xs mt-1 block">{form.formState.errors.companyName.message}</span>}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="join-contactPerson" className="text-sm font-semibold mb-1.5 block">{t('membership.form.contact')}</label>
                        <input 
                          {...form.register("contactPerson")} id="join-contactPerson" type="text" autoComplete="name" 
                          className="w-full border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        {form.formState.errors.contactPerson && <span className="text-destructive text-xs mt-1 block">{form.formState.errors.contactPerson.message}</span>}
                      </div>
                      <div>
                        <label htmlFor="join-phone" className="text-sm font-semibold mb-1.5 block">{t('membership.form.phone')}</label>
                        <input 
                          {...form.register("phone")} id="join-phone" type="tel" autoComplete="tel" 
                          className="w-full border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        {form.formState.errors.phone && <span className="text-destructive text-xs mt-1 block">{form.formState.errors.phone.message}</span>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="join-email" className="text-sm font-semibold mb-1.5 block">{t('membership.form.email')}</label>
                      <input 
                        {...form.register("email")} id="join-email" type="email" autoComplete="email" 
                        className="w-full border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        placeholder={t('membership.form.email_ph')}
                      />
                      {form.formState.errors.email && <span className="text-destructive text-xs mt-1 block">{form.formState.errors.email.message}</span>}
                    </div>

                    <div>
                      <label htmlFor="join-category" className="text-sm font-semibold mb-1.5 block">{t('membership.form.category')}</label>
                      <select 
                        {...form.register("category")} id="join-category" 
                        className="w-full border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                      >
                        <option value="">{t('membership.form.category_ph')}</option>
                        <option value="Patron">{t('membership.categories.patron.name')}</option>
                        <option value="Corporate">{t('membership.categories.corporate.name')}</option>
                        <option value="Business">{t('membership.categories.business.name')}</option>
                        <option value="Non-Profit">{t('membership.categories.nonprofit.name')}</option>
                      </select>
                      {form.formState.errors.category && <span className="text-destructive text-xs mt-1 block">{form.formState.errors.category.message}</span>}
                    </div>

                    <button 
                      type="submit" 
                      disabled={createEnquiry.isPending}
                      className="bg-primary text-primary-foreground py-4 rounded-sm font-bold mt-4 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                    >
                      {createEnquiry.isPending ? t('membership.form.submitting') : t('membership.form.submit')} 
                      {!createEnquiry.isPending && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>
                )}
    </>
  );
}
