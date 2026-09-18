-- Painel Pessoal v2 — ficha inicial padrão (braços/ombros priorizados, 5x/semana, A/B).
-- Chamada uma vez por usuário (via RPC) na primeira vez que ele abre o Treino sem
-- nenhum dia cadastrado ainda. É idempotente: não faz nada se o usuário já tiver
-- qualquer workout_day_templates (mesmo que tenha editado/apagado depois).

create or replace function public.seed_default_workout_plan(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Não autorizado.';
  end if;

  if exists (select 1 from public.workout_day_templates where user_id = p_user_id) then
    return; -- já tem ficha (inicial ou editada) — não sobrescreve.
  end if;

  -- ===================== SEMANA A =====================

  -- A · Segunda · Peito + Ombro + Tríceps
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'A', 1, 'Peito + Ombro + Tríceps', 'Peito, ombro, tríceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Supino reto', 4, 6, 8, 0),
    (p_user_id, v_template_id, 'Supino inclinado com halteres', 3, 8, 10, 1),
    (p_user_id, v_template_id, 'Desenvolvimento', 3, 6, 10, 2),
    (p_user_id, v_template_id, 'Elevação lateral', 4, 10, 15, 3),
    (p_user_id, v_template_id, 'Crucifixo/crossover', 2, 10, 15, 4),
    (p_user_id, v_template_id, 'Tríceps francês', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Tríceps corda', 3, 10, 15, 6);

  -- A · Terça · Pernas A (ênfase quadríceps)
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'A', 2, 'Pernas A — ênfase quadríceps', 'Quadríceps, panturrilha')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Agachamento ou Hack Squat', 4, 6, 10, 0),
    (p_user_id, v_template_id, 'Leg Press', 3, 8, 12, 1),
    (p_user_id, v_template_id, 'Cadeira extensora', 3, 10, 15, 2),
    (p_user_id, v_template_id, 'Afundo/passada', 3, 8, 12, 3),
    (p_user_id, v_template_id, 'Mesa/cadeira flexora', 3, 10, 15, 4),
    (p_user_id, v_template_id, 'Panturrilha', 4, 10, 15, 5);

  -- A · Quarta · Costas + Bíceps
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'A', 3, 'Costas + Bíceps', 'Costas, bíceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Puxada ou barra fixa', 4, 6, 10, 0),
    (p_user_id, v_template_id, 'Remada', 3, 6, 10, 1),
    (p_user_id, v_template_id, 'Remada baixa', 3, 8, 12, 2),
    (p_user_id, v_template_id, 'Pullover no cabo', 2, 10, 15, 3),
    (p_user_id, v_template_id, 'Rosca direta', 3, 8, 12, 4),
    (p_user_id, v_template_id, 'Rosca inclinada', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Rosca martelo', 2, 10, 15, 6);

  -- A · Quinta · Ombros + Braços
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'A', 4, 'Ombros + Braços', 'Ombro, bíceps, tríceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Desenvolvimento', 3, 8, 10, 0),
    (p_user_id, v_template_id, 'Elevação lateral', 4, 12, 15, 1),
    (p_user_id, v_template_id, 'Posterior de ombro', 3, 12, 15, 2),
    (p_user_id, v_template_id, 'Rosca Scott', 3, 8, 12, 3),
    (p_user_id, v_template_id, 'Rosca no cabo', 2, 10, 15, 4),
    (p_user_id, v_template_id, 'Tríceps testa', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Tríceps unilateral', 2, 10, 15, 6);

  -- A · Sexta · Pernas B (posterior/glúteos)
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'A', 5, 'Pernas B — posterior/glúteos', 'Posterior de coxa, glúteos, panturrilha')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Terra romeno', 4, 6, 10, 0),
    (p_user_id, v_template_id, 'Flexora', 4, 8, 12, 1),
    (p_user_id, v_template_id, 'Hip Thrust', 3, 8, 12, 2),
    (p_user_id, v_template_id, 'Leg Press (posição mais alta)', 3, 10, 12, 3),
    (p_user_id, v_template_id, 'Búlgaro/unilateral', 2, 8, 12, 4),
    (p_user_id, v_template_id, 'Panturrilha', 4, 10, 15, 5);

  -- ===================== SEMANA B =====================

  -- B · Segunda · Peito + Ombro + Tríceps (mesma base da segunda A)
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'B', 1, 'Peito + Ombro + Tríceps', 'Peito, ombro, tríceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Supino reto', 4, 6, 8, 0),
    (p_user_id, v_template_id, 'Supino inclinado com halteres', 3, 8, 10, 1),
    (p_user_id, v_template_id, 'Desenvolvimento', 3, 6, 10, 2),
    (p_user_id, v_template_id, 'Elevação lateral', 4, 10, 15, 3),
    (p_user_id, v_template_id, 'Crucifixo/crossover', 2, 10, 15, 4),
    (p_user_id, v_template_id, 'Tríceps francês', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Tríceps corda', 3, 10, 15, 6);

  -- B · Terça · Costas + Bíceps (mesma base da quarta A)
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'B', 2, 'Costas + Bíceps', 'Costas, bíceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Puxada ou barra fixa', 4, 6, 10, 0),
    (p_user_id, v_template_id, 'Remada', 3, 6, 10, 1),
    (p_user_id, v_template_id, 'Remada baixa', 3, 8, 12, 2),
    (p_user_id, v_template_id, 'Pullover no cabo', 2, 10, 15, 3),
    (p_user_id, v_template_id, 'Rosca direta', 3, 8, 12, 4),
    (p_user_id, v_template_id, 'Rosca inclinada', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Rosca martelo', 2, 10, 15, 6);

  -- B · Quarta · Pernas completas
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'B', 3, 'Pernas completas', 'Quadríceps, posterior, panturrilha')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Agachamento ou Hack', 4, 6, 10, 0),
    (p_user_id, v_template_id, 'Terra romeno', 3, 6, 10, 1),
    (p_user_id, v_template_id, 'Leg Press', 3, 10, 12, 2),
    (p_user_id, v_template_id, 'Flexora', 3, 10, 15, 3),
    (p_user_id, v_template_id, 'Extensora', 2, 12, 15, 4),
    (p_user_id, v_template_id, 'Panturrilha', 4, 10, 15, 5);

  -- B · Quinta · Ombros + Braços (mesma base da quinta A)
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'B', 4, 'Ombros + Braços', 'Ombro, bíceps, tríceps')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Desenvolvimento', 3, 8, 10, 0),
    (p_user_id, v_template_id, 'Elevação lateral', 4, 12, 15, 1),
    (p_user_id, v_template_id, 'Posterior de ombro', 3, 12, 15, 2),
    (p_user_id, v_template_id, 'Rosca Scott', 3, 8, 12, 3),
    (p_user_id, v_template_id, 'Rosca no cabo', 2, 10, 15, 4),
    (p_user_id, v_template_id, 'Tríceps testa', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Tríceps unilateral', 2, 10, 15, 6);

  -- B · Sexta · Upper — ênfase Ombros e Braços
  insert into workout_day_templates (user_id, variant, weekday, name, muscle_groups)
  values (p_user_id, 'B', 5, 'Upper — ênfase Ombros e Braços', 'Ombro, bíceps, tríceps, peito, costas')
  returning id into v_template_id;
  insert into workout_template_exercises (user_id, template_id, name, target_sets, rep_range_min, rep_range_max, order_index) values
    (p_user_id, v_template_id, 'Supino inclinado', 3, 8, 10, 0),
    (p_user_id, v_template_id, 'Puxada', 3, 8, 10, 1),
    (p_user_id, v_template_id, 'Remada', 3, 8, 12, 2),
    (p_user_id, v_template_id, 'Elevação lateral', 4, 12, 15, 3),
    (p_user_id, v_template_id, 'Posterior de ombro', 3, 12, 15, 4),
    (p_user_id, v_template_id, 'Bíceps (rosca à sua escolha)', 3, 8, 12, 5),
    (p_user_id, v_template_id, 'Tríceps (variação à sua escolha)', 3, 8, 12, 6);
end;
$$;

comment on function public.seed_default_workout_plan(uuid) is
  'Popula a ficha inicial padrão (A/B, 5x/semana, braços e ombros priorizados) para um usuário sem nenhum dia cadastrado. Idempotente e chamável via RPC do app.';
