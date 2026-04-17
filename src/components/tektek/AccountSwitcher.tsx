import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Plus, X } from "lucide-react";
import { useAuth, type SavedAccount } from "@/contexts/AuthContext";
import { Logo } from "@/components/tektek/Logo";

export const AccountSwitcher = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const { profile, savedAccounts, signOut, removeSavedAccount } = useAuth();

  const switchTo = async (acc: SavedAccount) => {
    await signOut();
    onClose();
    navigate("/auth", { state: { mode: "signin", email: acc.email } });
  };

  const addNew = async () => {
    await signOut();
    onClose();
    navigate("/auth", { state: { mode: "signin" } });
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate("/auth");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] rounded-t-3xl border-t border-border bg-card p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo />
                <span className="text-sm text-muted-foreground">contas</span>
              </div>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {savedAccounts.map((acc) => {
                const active = profile?.username === acc.username;
                return (
                  <div
                    key={acc.email}
                    className={`group flex items-center gap-3 rounded-2xl p-3 transition ${
                      active ? "bg-gradient-brand-soft ring-1 ring-primary/40" : "hover:bg-muted"
                    }`}
                  >
                    <button
                      onClick={() => !active && switchTo(acc)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <img
                        src={acc.avatar_url ?? `https://api.dicebear.com/9.x/avataaars/svg?seed=${acc.username}`}
                        alt={acc.username}
                        className="h-11 w-11 rounded-full bg-background object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-display font-semibold">
                            {acc.display_name}
                          </p>
                          {active && (
                            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          @{acc.username}
                        </p>
                      </div>
                    </button>
                    {!active && (
                      <button
                        onClick={() => removeSavedAccount(acc.email)}
                        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                        aria-label="Remover"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addNew}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-border p-3 text-left transition hover:bg-muted"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-brand text-background">
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="font-medium">Adicionar outra conta</span>
            </button>

            <button
              onClick={handleSignOut}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl p-3 text-left text-destructive transition hover:bg-destructive/10"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-destructive/15">
                <LogOut className="h-5 w-5" />
              </span>
              <span className="font-medium">Sair desta conta</span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
