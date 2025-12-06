"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCardMini } from "@/components/ui/credit-card-3d";
import { 
  Banknote, 
  CreditCard, 
  Smartphone, 
  QrCode, 
  Wallet,
  Building2,
  ArrowRightLeft,
  CircleDollarSign,
} from "lucide-react";

// Payment method types with icons
export const PAYMENT_METHODS = [
  { value: "bank_debit", label: "Debit from Bank Account", icon: Building2, group: "Bank" },
  { value: "credit_card", label: "Credit Card", icon: CreditCard, group: "Card" },
  { value: "tng_ewallet", label: "Touch 'n Go eWallet", icon: Smartphone, group: "eWallet" },
  { value: "mae_qr", label: "MAE QR Code", icon: QrCode, group: "eWallet" },
  { value: "grabpay", label: "GrabPay", icon: Wallet, group: "eWallet" },
  { value: "boost", label: "Boost", icon: Wallet, group: "eWallet" },
  { value: "shopeepay", label: "ShopeePay", icon: Wallet, group: "eWallet" },
  { value: "cash", label: "Cash", icon: Banknote, group: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer / IBG", icon: ArrowRightLeft, group: "Bank" },
  { value: "fpx", label: "FPX Online Banking", icon: Building2, group: "Bank" },
  { value: "duitnow", label: "DuitNow", icon: CircleDollarSign, group: "Bank" },
  { value: "other", label: "Other", icon: Wallet, group: "Other" },
] as const;

export type PaymentMethodType = typeof PAYMENT_METHODS[number]["value"];

interface CreditCardOption {
  id: string;
  bankName: string;
  cardType: string;
  cardName: string;
  cardColor: string;
  lastFourDigits?: string | null;
}

interface PaymentMethodSelectProps {
  value?: string | null;
  creditCardId?: string | null;
  onValueChange: (paymentMethod: string, creditCardId?: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showCreditCards?: boolean;
}

async function fetchCreditCards(): Promise<CreditCardOption[]> {
  const res = await fetch("/api/credit-cards");
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

export function PaymentMethodSelect({
  value,
  creditCardId,
  onValueChange,
  placeholder = "Select payment method",
  disabled = false,
  className,
  showCreditCards = true,
}: PaymentMethodSelectProps) {
  // Fetch credit cards if needed
  const { data: creditCards = [] } = useQuery({
    queryKey: ["credit-cards"],
    queryFn: fetchCreditCards,
    enabled: showCreditCards,
  });

  // Group payment methods
  const groupedMethods = PAYMENT_METHODS.reduce((acc, method) => {
    // Skip generic credit card option if we are showing specific cards and have them
    if (showCreditCards && creditCards.length > 0 && method.value === "credit_card") {
      return acc;
    }

    if (!acc[method.group]) {
      acc[method.group] = [];
    }
    acc[method.group].push(method);
    return acc;
  }, {} as Record<string, typeof PAYMENT_METHODS[number][]>);

  // Determine current value display
  const getDisplayValue = () => {
    if (value === "credit_card" && creditCardId) {
      const card = creditCards.find((c) => c.id === creditCardId);
      if (card) {
        return `${card.cardName} •••• ${card.lastFourDigits || ""}`;
      }
    }
    const method = PAYMENT_METHODS.find((m) => m.value === value);
    return method?.label || placeholder;
  };

  // Handle selection
  const handleSelect = (selectedValue: string) => {
    // Check if it's a credit card ID
    if (selectedValue.startsWith("cc_")) {
      const cardId = selectedValue.replace("cc_", "");
      onValueChange("credit_card", cardId);
    } else {
      onValueChange(selectedValue, null);
    }
  };

  // Get current select value
  const getCurrentValue = () => {
    if (value === "credit_card" && creditCardId) {
      return `cc_${creditCardId}`;
    }
    return value || "";
  };

  return (
    <Select
      value={getCurrentValue()}
      onValueChange={handleSelect}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          <span className="flex items-center gap-2">
            {value && (
              <>
                {(() => {
                  if (value === "credit_card") {
                    return <CreditCard className="w-4 h-4" />;
                  }
                  const Icon = PAYMENT_METHODS.find((m) => m.value === value)?.icon || Wallet;
                  return <Icon className="w-4 h-4" />;
                })()}
                <span className="truncate">{getDisplayValue()}</span>
              </>
            )}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Credit Cards Group */}
        {showCreditCards && creditCards.length > 0 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Credit Cards
            </SelectLabel>
            {creditCards.map((card) => (
              <SelectItem key={card.id} value={`cc_${card.id}`}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-4 rounded"
                    style={{
                      background:
                        card.cardColor === "gradient-blue"
                          ? "linear-gradient(135deg, #1a1a2e, #0f3460)"
                          : card.cardColor === "gradient-purple"
                          ? "linear-gradient(135deg, #1a1a2e, #4a1d6e)"
                          : card.cardColor === "gradient-green"
                          ? "linear-gradient(135deg, #0a1628, #1a4d2e)"
                          : "linear-gradient(135deg, #1a1a2e, #2a2a2a)",
                    }}
                  />
                  <span>
                    {card.cardName}
                    {card.lastFourDigits && (
                      <span className="text-muted-foreground ml-1">
                        •••• {card.lastFourDigits}
                      </span>
                    )}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Other Payment Methods */}
        {Object.entries(groupedMethods).map(([group, methods]) => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {methods.map((method) => {
              const Icon = method.icon;
              return (
                <SelectItem key={method.value} value={method.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{method.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

// Helper to get payment method label
export function getPaymentMethodLabel(
  paymentMethod?: string | null,
  creditCardName?: string | null
): string {
  if (!paymentMethod) return "Not specified";
  if (paymentMethod === "credit_card" && creditCardName) {
    return creditCardName;
  }
  const method = PAYMENT_METHODS.find((m) => m.value === paymentMethod);
  return method?.label || paymentMethod;
}

// Helper to get payment method icon
export function getPaymentMethodIcon(paymentMethod?: string | null) {
  if (!paymentMethod) return Wallet;
  const method = PAYMENT_METHODS.find((m) => m.value === paymentMethod);
  return method?.icon || Wallet;
}
