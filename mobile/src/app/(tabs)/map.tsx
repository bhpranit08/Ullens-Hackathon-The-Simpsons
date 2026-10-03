import { useState } from "react";
import { router } from "expo-router";
import { useResource } from "@/hooks/use-resource";
import type { Hazard } from "@/lib/types";
import { categories } from "@/lib/types";
import { TrailMap } from "@/components/trail-map";
import {
  Screen,
  Card,
  Copy,
  Choices,
  Button,
  ErrorMessage,
  Loading,
  Status,
} from "@/components/ui";
export default function MapScreen() {
  const [category, setCategory] = useState("All"),
    [recent, setRecent] = useState("7 days");
  const query = new URLSearchParams();
  if (category !== "All") query.set("category", category);
  if (recent !== "All time")
    query.set(
      "recent",
      recent === "24 hours" ? "24h" : recent === "7 days" ? "7d" : "30d",
    );
  const resource = useResource<{ hazards: Hazard[] }>(
    "/hazards?" + query.toString(),
  );
  return (
    <Screen
      title="Know the trail"
      subtitle="Community observations to help you plan your next route."
    >
      <Card>
        <Choices
          label="Hazard category"
          value={category}
          options={["All", ...categories]}
          onChange={setCategory}
        />
        <Choices
          label="Reported within"
          value={recent}
          options={["24 hours", "7 days", "30 days", "All time"]}
          onChange={setRecent}
        />
        <TrailMap hazards={resource.data?.hazards || []} height={360} />
        <Button
          label="Report a hazard"
          onPress={() => router.push("/hazards/new")}
        />
        <Copy muted>
          Reports are community observations, not verified road conditions.
        </Copy>
      </Card>
      <ErrorMessage message={resource.error} />
      {resource.loading && <Loading />}
      {resource.data?.hazards.map((h) => (
        <Card key={h.id} title={h.category}>
          <Status value={h.severity} />
          <Copy>{h.description}</Copy>
          <Copy muted>
            {new Date(h.createdAt).toLocaleString()} ·{" "}
            {h.location.lat.toFixed(4)}, {h.location.lng.toFixed(4)}
          </Copy>
        </Card>
      ))}
      {!resource.loading && !resource.data?.hazards.length && (
        <Copy muted>No reports match these filters.</Copy>
      )}
    </Screen>
  );
}
