'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { plans } from '@/lib/api';

type ComplianceStatus = 'FULL' | 'PARTIAL' | 'OFF' | null;

export default function DashboardPage() {
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [todayPlan, setTodayPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodayPlan = async () => {
      try {
        const response = await plans.getToday();
        setTodayPlan(response.data);
      } catch (_err) {
        setError('Failed to load today plan');
      }
    };

    fetchTodayPlan();
  }, []);

  const handleComplianceClick = async (status: ComplianceStatus) => {
    if (!status) return;

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement real compliance logging via compliance.log() in Sprint 1
      setComplianceStatus(status);
      // Simulate success
      setTimeout(() => setIsLoading(false), 500);
    } catch (_err) {
      setError('Failed to log compliance');
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: ComplianceStatus) => {
    switch (status) {
      case 'FULL':
        return <CheckCircle2 className="w-6 h-6" />;
      case 'PARTIAL':
        return <AlertCircle className="w-6 h-6" />;
      case 'OFF':
        return <XCircle className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: ComplianceStatus): string => {
    switch (status) {
      case 'FULL':
        return 'bg-compliance-full';
      case 'PARTIAL':
        return 'bg-compliance-partial';
      case 'OFF':
        return 'bg-compliance-off';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400">Today&rsquo;s nutrition plan compliance</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Today's Plan */}
        {todayPlan && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">{todayPlan.dayName}</CardTitle>
              <CardDescription>Plan: {todayPlan.planName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayPlan.meals && todayPlan.meals.length > 0 ? (
                  todayPlan.meals.map((meal: any) => (
                    <div
                      key={meal.id}
                      className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700"
                    >
                      <div>
                        <p className="text-white font-medium">{meal.mealType}</p>
                        <p className="text-slate-400 text-sm">{meal.description}</p>
                      </div>
                      <p className="text-slate-300 font-mono">{meal.targetKcal} kcal</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No meals planned for today. Upload a plan first.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compliance Status */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Log Compliance</CardTitle>
            <CardDescription>How did you follow today&rsquo;s plan?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {complianceStatus && (
                <div
                  className={`p-4 rounded-lg text-white text-center font-semibold flex items-center justify-center gap-2 ${getStatusColor(complianceStatus)}`}
                >
                  {getStatusIcon(complianceStatus)}
                  {complianceStatus === 'FULL' && 'Perfect! You followed the plan.'}
                  {complianceStatus === 'PARTIAL' && 'Good effort with some deviations.'}
                  {complianceStatus === 'OFF' && 'Off day &ndash; rest and try again tomorrow.'}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => handleComplianceClick('FULL')}
                  disabled={isLoading}
                  variant={complianceStatus === 'FULL' ? 'compliance' : 'outline'}
                  size="touch"
                  className="w-full"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Plan OK (5pt)
                </Button>

                <Button
                  onClick={() => handleComplianceClick('PARTIAL')}
                  disabled={isLoading}
                  variant={complianceStatus === 'PARTIAL' ? 'compliancePartial' : 'outline'}
                  size="touch"
                  className="w-full"
                >
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Deviations (3pt)
                </Button>

                <Button
                  onClick={() => handleComplianceClick('OFF')}
                  disabled={isLoading}
                  variant={complianceStatus === 'OFF' ? 'complianceOff' : 'outline'}
                  size="touch"
                  className="w-full"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Off Day (0pt)
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                Real compliance logging available in Sprint 3 phase 2
              </p>
            </div>
          </CardContent>
        </Card>

        {/* TODO Features */}
        <Card className="bg-slate-900 border-slate-800 border-dashed">
          <CardHeader>
            <CardTitle className="text-white">Coming Soon - Sprint 3 Phase 2</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>✓ Piano Settimanale - View and edit 7 days</li>
              <li>✓ Storico Compliance - 30-day heatmap</li>
              <li>✓ Upload Piano - PDF drag & drop parsing</li>
              <li>✓ Settings - Target kcal and integrations</li>
              <li>✓ Trends - Weight and compliance graphs</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
