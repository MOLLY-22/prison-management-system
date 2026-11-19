export default function OfficerinChargeReleaseAuthorizationModal() {
    return (
            <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center hidden" id="authModal">
                  <div className="bg-surface-container-lowest w-full max-w-lg p-space-xl rounded-lg shadow-xl border border-outline-variant/40 flex flex-col space-y-space-lg">
                        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-space-md">
                              <div className="flex items-center gap-space-sm text-error">
                                    <span className="material-symbols-outlined text-[28px]">gavel</span>
                                    <h3 className="font-headline-md text-primary">High-Security Release Authorization</h3>
                              </div>
                              <button type="button" className="text-on-surface-variant hover:text-on-surface" onClick={() => document.getElementById("authModal")?.classList.add("hidden")}>
                                    <span className="material-symbols-outlined">close</span>
                              </button>
                        </div>
                        <div className="space-y-space-md">
                              <div className="p-space-md bg-error-container text-on-error-container rounded text-body-md">
                                    <strong>WARNING:</strong> You are executing an irreversible release protocol for <span className="underline font-semibold" id="modalInmateName">Sarah J. Holloway</span> (<span className="font-mono" id="modalInmateId">#REC-44102</span>). All biometric tokens and warrants will be permanently archived.
                              </div>
                              <div>
                                    <label className="block text-label-sm text-on-surface-variant mb-space-xs">Officer-in-Charge Badge Number</label>
                                    <input className="w-full px-space-md py-2 bg-surface border border-outline-variant rounded text-body-md text-on-surface outline-none focus:ring-1 focus:ring-primary font-mono" placeholder="ENTER-BADGE-PIN" type="text" />
                              </div>
                              <div>
                                    <label className="block text-label-sm text-on-surface-variant mb-space-xs">Mandatory Re-confirmation Passcode</label>
                                    <input className="w-full px-space-md py-2 bg-surface border border-outline-variant rounded text-body-md text-on-surface outline-none focus:ring-1 focus:ring-primary" placeholder="••••••••••••" type="password" />
                              </div>
                              <div className="flex items-center gap-space-sm">
                                    <input className="w-4 h-4 accent-error" id="confirmCheck" type="checkbox" />
                                    <label className="text-body-sm text-on-surface" htmlFor="confirmCheck">I verify that all clearance steps have been physically inspected and verified.</label>
                              </div>
                        </div>
                        <div className="flex justify-end gap-space-md pt-space-md border-t border-outline-variant/30">
                              <button type="button" className="px-space-md py-2 bg-surface-container-high text-on-surface rounded text-label-md font-medium" onClick={() => document.getElementById("authModal")?.classList.add("hidden")}>Abort</button>
                              <button type="button" className="px-space-md py-2 bg-error text-on-error rounded text-label-md font-medium hover:opacity-90 transition-all">Execute Final Release</button>
                        </div>
                  </div>
            </div>
    );
}