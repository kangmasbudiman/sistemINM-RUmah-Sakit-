import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Logo Sistem INM Rumah Sakit"
        width={44}
        height={44}
        priority
        className="h-11 w-11 shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
      />
      <div className="leading-tight">
        <div className="text-lg font-bold text-dark dark:text-white">
          Sistem INM RS
        </div>
        <div className="text-xs font-medium text-gray-6 dark:text-dark-6">
          Royal Prima Jambi
        </div>
      </div>
    </div>
  );
}
