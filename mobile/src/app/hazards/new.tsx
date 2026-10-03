import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "@/auth";
import { useAction } from "@/hooks/use-resource";
import { categories, type Location } from "@/lib/types";
import { initialLocation } from "@/lib/tracking";
import { TrailMap } from "@/components/trail-map";
import {
  Screen,
  Card,
  Copy,
  Choices,
  Field,
  Button,
  ErrorMessage,
} from "@/components/ui";
export default function ReportHazard() {
  const { api } = useAuth(),
    action = useAction();
  const [category, setCategory] = useState("Road"),
    [severity, setSeverity] = useState("medium"),
    [description, setDescription] = useState(""),
    [location, setLocation] = useState<Location>();
  return (
    <Screen
      title="Report a hazard"
      subtitle="Help the next person make a safer route choice."
    >
      <Card>
        <Choices
          label="Category"
          options={categories}
          value={category}
          onChange={setCategory}
        />
        <Choices
          label="Severity"
          options={["low", "medium", "high"]}
          value={severity}
          onChange={setSeverity}
        />
        <Field
          label="What did you see?"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
          placeholder="Describe the hazard and useful landmarks."
        />
        <Copy>Tap the map to choose the report location.</Copy>
        <TrailMap selected={location} onSelect={setLocation} />
        <Copy muted>
          {location
            ? location.lat.toFixed(5) + ", " + location.lng.toFixed(5)
            : "No location selected"}
        </Copy>
        <Button
          label="Use my current location"
          variant="secondary"
          busy={action.busy}
          onPress={() =>
            void action.run(async () => setLocation(await initialLocation()))
          }
        />
        <ErrorMessage message={action.error} />
        <Button
          label="Submit hazard report"
          disabled={!location || !description.trim()}
          busy={action.busy}
          onPress={() =>
            void action.run(async () => {
              await api("/hazards", {
                category,
                severity,
                description,
                location,
              });
              router.replace("/map");
            })
          }
        />
      </Card>
    </Screen>
  );
}
