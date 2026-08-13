import React from "react"
import { useTranslations } from "next-intl"
import { FieldGroup, Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { useShallow } from "zustand/react/shallow"
import { useCreateMockApiStore } from "../../store/useCreateMockApiStore"

export function GenerationOptions() {
  const t = useTranslations("MockApiDialog")
  // 관련 상태·액션만 얕은 비교로 구독해, 스키마 편집 등 무관한 상태 변화에 리렌더되지 않도록 한다.
  const {
    itemCount,
    setItemCount,
    enablePagination,
    setEnablePagination,
    pageParam,
    setPageParam,
    limitParam,
    setLimitParam,
    enableSort,
    setEnableSort,
    sortParam,
    setSortParam,
    orderParam,
    setOrderParam,
    enableSearch,
    setEnableSearch,
    searchParam,
    setSearchParam,
  } = useCreateMockApiStore(
    useShallow((state) => ({
      itemCount: state.itemCount,
      setItemCount: state.setItemCount,
      enablePagination: state.enablePagination,
      setEnablePagination: state.setEnablePagination,
      pageParam: state.pageParam,
      setPageParam: state.setPageParam,
      limitParam: state.limitParam,
      setLimitParam: state.setLimitParam,
      enableSort: state.enableSort,
      setEnableSort: state.setEnableSort,
      sortParam: state.sortParam,
      setSortParam: state.setSortParam,
      orderParam: state.orderParam,
      setOrderParam: state.setOrderParam,
      enableSearch: state.enableSearch,
      setEnableSearch: state.setEnableSearch,
      searchParam: state.searchParam,
      setSearchParam: state.setSearchParam,
    }))
  )

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            3
          </span>
          {t("generationOptions")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <FieldLabel>{t("mockItems")}</FieldLabel>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
              {t("itemsCount", { count: itemCount[0] ?? 0 })}
            </span>
          </div>
          <Slider
            min={1}
            max={50}
            step={1}
            value={itemCount}
            onValueChange={setItemCount}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <FieldLabel>{t("apiFeatures")}</FieldLabel>

          <FieldGroup className="gap-6">
            <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <FieldLabel
                  className="cursor-pointer"
                  onClick={() => setEnablePagination(!enablePagination)}
                >
                  {t("paginationMetadata")}
                </FieldLabel>
                <Switch
                  checked={enablePagination}
                  onCheckedChange={setEnablePagination}
                />
              </div>
              {enablePagination && (
                <FieldGroup className="animate-in gap-4 duration-200 fade-in slide-in-from-top-2">
                  <Field className="flex-1">
                    <FieldLabel className="text-xs">{t("pageParam")}</FieldLabel>
                    <Input
                      className="h-8 bg-background text-xs"
                      value={pageParam}
                      onChange={(e) => setPageParam(e.target.value)}
                      placeholder={t("pageParamPlaceholder")}
                    />
                  </Field>
                  <Field className="flex-1">
                    <FieldLabel className="text-xs">{t("limitParam")}</FieldLabel>
                    <Input
                      className="h-8 bg-background text-xs"
                      value={limitParam}
                      onChange={(e) => setLimitParam(e.target.value)}
                      placeholder={t("limitParamPlaceholder")}
                    />
                  </Field>
                </FieldGroup>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <FieldLabel
                  className="cursor-pointer"
                  onClick={() => setEnableSort(!enableSort)}
                >
                  {t("sortFeature")}
                </FieldLabel>
                <Switch checked={enableSort} onCheckedChange={setEnableSort} />
              </div>
              {enableSort && (
                <FieldGroup className="animate-in gap-4 duration-200 fade-in slide-in-from-top-2">
                  <Field className="flex-1">
                    <FieldLabel className="text-xs">{t("sortParam")}</FieldLabel>
                    <Input
                      className="h-8 bg-background text-xs"
                      value={sortParam}
                      onChange={(e) => setSortParam(e.target.value)}
                      placeholder={t("sortParamPlaceholder")}
                    />
                  </Field>
                  <Field className="flex-1">
                    <FieldLabel className="text-xs">{t("orderParam")}</FieldLabel>
                    <Input
                      className="h-8 bg-background text-xs"
                      value={orderParam}
                      onChange={(e) => setOrderParam(e.target.value)}
                      placeholder={t("orderParamPlaceholder")}
                    />
                  </Field>
                </FieldGroup>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <FieldLabel
                  className="cursor-pointer"
                  onClick={() => setEnableSearch(!enableSearch)}
                >
                  {t("searchFeature")}
                </FieldLabel>
                <Switch
                  checked={enableSearch}
                  onCheckedChange={setEnableSearch}
                />
              </div>
              {enableSearch && (
                <FieldGroup className="animate-in gap-4 duration-200 fade-in slide-in-from-top-2">
                  <Field className="flex-1">
                    <FieldLabel className="text-xs">
                      {t("searchParam")}
                    </FieldLabel>
                    <Input
                      className="h-8 bg-background text-xs"
                      value={searchParam}
                      onChange={(e) => setSearchParam(e.target.value)}
                      placeholder={t("searchParamPlaceholder")}
                    />
                  </Field>
                </FieldGroup>
              )}
            </div>
          </FieldGroup>
        </div>
      </CardContent>
    </Card>
  )
}
