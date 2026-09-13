import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { SEO } from '@/components/seo';
import { CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateEnquiry } from "@workspace/api-client-react";

const formSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactPerson: z.string().min(2, "Contact name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(6, "Phone number is required"),
  category: z.enum(["Patron", "Corporate", "Business", "Non-Profit"], { required_error: "Please select a category" }),
  message: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export default function Membership() {
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

  const benefits = t('membership.benefits') as unknown as string[];

  return (
    <div className="w-full">
      <SEO title={t('membership.title')} description={t('membership.subtitle')} />
      
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-20 pb-32">
        <div className="container mx-auto px-4 md:px-8">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">{t('membership.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {t('membership.subtitle')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 -mt-16 relative z-10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Col: Info */}
            <div className="lg:col-span-7 bg-background p-8 border border-border shadow-xl rounded-sm">
              <h2 className="text-2xl font-serif font-bold mb-6">{t('membership.why_join')}</h2>
              <ul className="flex flex-col gap-4 mb-12">
                {Array.isArray(benefits) && benefits.map((benefit, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>

              <h2 className="text-2xl font-serif font-bold mb-6 pt-8 border-t border-border">{t('membership.categories_title')}</h2>
              <div className="space-y-6">
                {[
                  { id: 'patron', name: t('membership.categories.patron.name'), desc: t('membership.categories.patron.desc') },
                  { id: 'corporate', name: t('membership.categories.corporate.name'), desc: t('membership.categories.corporate.desc') },
                  { id: 'business', name: t('membership.categories.business.name'), desc: t('membership.categories.business.desc') },
                  { id: 'nonprofit', name: t('membership.categories.nonprofit.name'), desc: t('membership.categories.nonprofit.desc') }
                ].map((cat, i) => (
                  <div key={i} className="border border-border p-6 rounded-sm hover:border-primary/30 transition-colors bg-white">
                    <h3 className="font-bold text-lg mb-2 text-primary">{cat.name}</h3>
                    <p className="text-muted-foreground text-sm">{cat.desc}</p>
                    <p className="text-xs text-foreground mt-4 font-semibold">{t('membership.fee_basis')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Form */}
            <div className="lg:col-span-5 relative z-20">
              <div className="bg-white border-2 border-border p-8 sticky top-24 rounded-sm shadow-xl">
                <h3 className="text-2xl font-serif font-bold mb-2">{t('membership.form.title')}</h3>
                <p className="text-sm text-muted-foreground mb-8">{t('membership.form.subtitle')}</p>
                
                {submitStatus === 'success' ? (
                  <div className="bg-primary/5 border border-primary/20 p-8 text-center rounded-sm">
                    <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h4 className="font-bold text-lg mb-2">{t('membership.form.success_title')}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{t('membership.form.success_desc')}</p>
                    <div className="bg-white py-2 px-4 rounded-sm border border-border inline-block text-sm font-mono font-bold text-foreground">
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
                      <label className="text-sm font-semibold mb-1.5 block">{t('membership.form.company')}</label>
                      <input 
                        {...form.register("companyName")} 
                        className="w-full border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        placeholder={t('membership.form.company_ph')}
                      />
                      {form.formState.errors.companyName && <span className="text-destructive text-xs mt-1 block">{form.formState.errors.companyName.message}</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold mb-1.5 block">{t('membership.form.contact')}</label>
                        <input 
                          {...form.register("contactPerson")} 
                          className="w-full border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        {form.formState.errors.contactPerson && <span className="text-destructive text-xs mt-1 block">{form.formState.errors.contactPerson.message}</span>}
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-1.5 block">{t('membership.form.phone')}</label>
                        <input 
                          {...form.register("phone")} 
                          className="w-full border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        {form.formState.errors.phone && <span className="text-destructive text-xs mt-1 block">{form.formState.errors.phone.message}</span>}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-1.5 block">{t('membership.form.email')}</label>
                      <input 
                        {...form.register("email")} 
                        className="w-full border border-border p-3 rounded-sm bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        placeholder={t('membership.form.email_ph')}
                      />
                      {form.formState.errors.email && <span className="text-destructive text-xs mt-1 block">{form.formState.errors.email.message}</span>}
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-1.5 block">{t('membership.form.category')}</label>
                      <select 
                        {...form.register("category")} 
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
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
