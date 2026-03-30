import { zodResolver } from "@hookform/resolvers/zod";
import { Hash, Plus, Search } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import type { RoomSummary } from "@/shared/types/contracts";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Input } from "@/shared/ui/Input";
import { Panel } from "@/shared/ui/Panel";
import { Badge } from "@/shared/ui/Badge";
import { cn } from "@/shared/utils/cn";
import { formatRelativeTime } from "@/shared/utils/format";

const createRoomSchema = z.object({
  name: z.string().min(3, "At least 3 characters").max(80, "Max 80 characters"),
  description: z.string().max(400, "Max 400 characters").optional(),
});

const joinRoomSchema = z.object({
  roomId: z.string().uuid("Enter a valid room id"),
});

type CreateRoomSchema = z.infer<typeof createRoomSchema>;
type JoinRoomSchema = z.infer<typeof joinRoomSchema>;

interface RoomsSidebarProps {
  rooms: RoomSummary[];
  activeRoomId?: string;
  search: string;
  onSearchChange: (value: string) => void;
  onCreateRoom: (values: CreateRoomSchema) => void;
  onJoinRoom: (roomId: string) => void;
}

export const RoomsSidebar = ({
  rooms,
  activeRoomId,
  search,
  onSearchChange,
  onCreateRoom,
  onJoinRoom,
}: RoomsSidebarProps) => {
  const createForm = useForm<CreateRoomSchema>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  const joinForm = useForm<JoinRoomSchema>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: {
      roomId: "",
    },
  });

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) =>
      `${room.name} ${room.description ?? ""} ${room.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [rooms, search]);

  return (
    <Panel className="flex h-full min-h-[70vh] flex-col overflow-hidden">
      <div className="border-b border-border/70 px-5 py-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" />
          <Input
            aria-label="Search rooms"
            className="pl-11"
            placeholder="Search rooms"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4 border-b border-border/70 px-5 py-5">
        <form
          className="grid gap-3"
          onSubmit={createForm.handleSubmit((values) => {
            onCreateRoom(values);
            createForm.reset();
          })}
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent" />
            <h3 className="font-heading text-lg">Create room</h3>
          </div>
          <Input aria-label="Room name" placeholder="Design war room" {...createForm.register("name")} />
          <Input aria-label="Room description" placeholder="Optional description" {...createForm.register("description")} />
          {createForm.formState.errors.name ? (
            <p className="text-xs text-danger-500">{createForm.formState.errors.name.message}</p>
          ) : null}
          <Button type="submit">Create</Button>
        </form>

        <form
          className="grid gap-3"
          onSubmit={joinForm.handleSubmit((values) => {
            onJoinRoom(values.roomId);
            joinForm.reset();
          })}
        >
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-coral-400" />
            <h3 className="font-heading text-lg">Join by id</h3>
          </div>
          <Input aria-label="Room ID" placeholder="Paste room id" {...joinForm.register("roomId")} />
          {joinForm.formState.errors.roomId ? (
            <p className="text-xs text-danger-500">{joinForm.formState.errors.roomId.message}</p>
          ) : null}
          <Button type="submit" variant="secondary">
            Join room
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredRooms.length ? (
          <div className="space-y-3">
            {filteredRooms.map((room) => (
              <Link
                key={room.id}
                to={`/app/rooms/${room.id}`}
                className={cn(
                  "focus-ring block rounded-[24px] border border-border/70 px-4 py-4 transition hover:border-border-strong hover:bg-surface-3/80",
                  room.id === activeRoomId && "border-accent/50 bg-surface-3/90 shadow-glow"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-heading text-lg text-text-base">{room.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-text-muted">
                      {room.description ?? "No description"}
                    </p>
                  </div>
                  <Badge>{room.memberCount}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-text-soft">
                  <span>{room.role}</span>
                  <span>{formatRelativeTime(room.lastActivityAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            eyebrow="Rooms"
            title="No rooms yet"
            description="Create your first collaboration room or join one with a shared id."
          />
        )}
      </div>
    </Panel>
  );
};
