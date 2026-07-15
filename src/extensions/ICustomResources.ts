export interface ICustomResources {

    custom_trains: Record<string, {
        base_train_type?: string,
        name?: string,
        description?: string,
        rider_offset?: number,
        bve_sound_base_id?: string,
        speed_sound_count?: number,
        speed_sound_base_id?: string,
        door_sound_base_id?: string,
        door_close_sound_time?: number,
        accel_sound_at_coast?: boolean,
        const_playback_speed?: boolean,
        entity_ids?: string[],
        model_properties?: {
            transport_mode: string,
            length: number,
            width: number
        }
    }>
}