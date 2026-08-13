import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/routing"
import { Button } from "@workspace/ui/components/button"

export default async function NotFound() {
  const t = await getTranslations("Error")

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("notFoundDescription")}
      </p>
      <Button asChild>
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </div>
  )
}
