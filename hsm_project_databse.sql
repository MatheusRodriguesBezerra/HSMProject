PGDMP      +                }           HSM-MainServer    17.2    17.2 *    l           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false            m           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false            n           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false            o           1262    24946    HSM-MainServer    DATABASE     �   CREATE DATABASE "HSM-MainServer" WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'Portuguese_Brazil.1252';
     DROP DATABASE "HSM-MainServer";
                     postgres    false                        3079    33140    pgcrypto 	   EXTENSION     <   CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
    DROP EXTENSION pgcrypto;
                        false            p           0    0    EXTENSION pgcrypto    COMMENT     <   COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';
                             false    2                       1255    41331 D   create_user(character varying, character varying, character varying)    FUNCTION     �  CREATE FUNCTION public.create_user(p_name character varying, p_email character varying, p_password character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_salt VARCHAR(255);
    v_hashed_password VARCHAR(255);
    o_user_id INTEGER;
BEGIN
    -- Gera salt aleatório de 16 bytes (32 caracteres hex)
    v_salt := encode(gen_random_bytes(16), 'hex');
    
    -- Cria hash MD5 da senha + salt
    v_hashed_password := md5(p_password || v_salt);
    
    -- Insere usuário e captura o ID gerado
    INSERT INTO users (name, email, password, salt, role_id, status)
    VALUES (p_name, p_email, v_hashed_password, v_salt, 1, 'active')
    RETURNING id INTO o_user_id;

    -- Retorna o ID do novo usuário
    RETURN o_user_id;
END;
$$;
 u   DROP FUNCTION public.create_user(p_name character varying, p_email character varying, p_password character varying);
       public               postgres    false                       1255    41333 I   create_user_func(character varying, character varying, character varying)    FUNCTION     �  CREATE FUNCTION public.create_user_func(p_name character varying, p_email character varying, p_password character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_salt VARCHAR(255);
    v_hashed_password VARCHAR(255);
    o_user_id INTEGER;
BEGIN
    -- Gera salt aleatório de 16 bytes (32 caracteres hex)
    v_salt := encode(gen_random_bytes(16), 'hex');
    
    -- Cria hash MD5 da senha + salt
    v_hashed_password := md5(p_password || v_salt);
    
    -- Insere usuário e captura o ID gerado
    INSERT INTO users (name, email, password, salt, role_id, status)
    VALUES (p_name, p_email, v_hashed_password, v_salt, 1, 'active')
    RETURNING id INTO o_user_id;

    -- Retorna o ID do novo usuário
    RETURN o_user_id;
END;
$$;
 z   DROP FUNCTION public.create_user_func(p_name character varying, p_email character varying, p_password character varying);
       public               postgres    false                       1255    41334 +   login(character varying, character varying)    FUNCTION     �  CREATE FUNCTION public.login(p_name character varying, p_password character varying) RETURNS TABLE(id integer, name character varying, email character varying, role_id integer, status character varying, is_valid boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user RECORD;
    v_hashed_password VARCHAR;
BEGIN
    -- Busca o usuário pelo nome (corrigindo a ambiguidade)
    SELECT u.* INTO v_user 
    FROM users u 
    WHERE u.name = p_name 
    LIMIT 1;
    
    -- Se o usuário existir, verifica a senha
    IF FOUND THEN
        -- Gera o hash da senha fornecida com o salt armazenado
        v_hashed_password := md5(p_password || v_user.salt);
        
        -- Retorna os dados com base na verificação
        IF v_hashed_password = v_user.password THEN
            RETURN QUERY SELECT 
                v_user.id, 
                v_user.name, 
                v_user.email, 
                v_user.role_id, 
                v_user.status, 
                TRUE;
        ELSE
            RETURN QUERY SELECT 
                v_user.id, 
                v_user.name, 
                v_user.email, 
                v_user.role_id, 
                v_user.status, 
                FALSE;
        END IF;
    ELSE
        -- Retorna valores nulos para usuário não encontrado
        RETURN QUERY SELECT 
            NULL::INTEGER, 
            NULL::VARCHAR, 
            NULL::VARCHAR, 
            NULL::INTEGER, 
            NULL::VARCHAR, 
            FALSE;
    END IF;
END;
$$;
 T   DROP FUNCTION public.login(p_name character varying, p_password character varying);
       public               postgres    false                       1255    41359 #   update_user_password(integer, text)    FUNCTION     �  CREATE FUNCTION public.update_user_password(p_user_id integer, p_password text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_salt TEXT;
    v_hashed_password TEXT;
BEGIN
    -- Gera salt aleatório de 16 bytes (32 caracteres hex)
    v_salt := encode(gen_random_bytes(16), 'hex');
    
    -- Cria hash MD5 da senha + salt
    v_hashed_password := md5(p_password || v_salt);
    
    -- Atualiza a senha e salt do usuário existente
    UPDATE users
    SET password = v_hashed_password,
        salt = v_salt,
		status = 'active'
    WHERE id = p_user_id;
	
    -- Retorna o ID do usuário atualizado
    RETURN p_user_id;
END;
$$;
 O   DROP FUNCTION public.update_user_password(p_user_id integer, p_password text);
       public               postgres    false            �            1259    24955    users    TABLE     �  CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255),
    salt character varying(255),
    role_id integer NOT NULL,
    status character varying(255) NOT NULL,
    created_by integer,
    server_name_1 character varying(255),
    key_reference_1 text,
    server_name_2 character varying(255),
    key_reference_2 text
);
    DROP TABLE public.users;
       public         heap r       postgres    false            �            1259    24954    User_id_seq    SEQUENCE     �   CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public."User_id_seq";
       public               postgres    false    221            q           0    0    User_id_seq    SEQUENCE OWNED BY     >   ALTER SEQUENCE public."User_id_seq" OWNED BY public.users.id;
          public               postgres    false    220            �            1259    41390    logs    TABLE     �   CREATE TABLE public.logs (
    id integer NOT NULL,
    user_id integer,
    endpoint text,
    ip_address inet,
    status character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.logs;
       public         heap r       postgres    false            �            1259    41389    logs_id_seq    SEQUENCE     �   CREATE SEQUENCE public.logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 "   DROP SEQUENCE public.logs_id_seq;
       public               postgres    false    225            r           0    0    logs_id_seq    SEQUENCE OWNED BY     ;   ALTER SEQUENCE public.logs_id_seq OWNED BY public.logs.id;
          public               postgres    false    224            �            1259    24948    roles    TABLE     h   CREATE TABLE public.roles (
    id integer NOT NULL,
    description character varying(255) NOT NULL
);
    DROP TABLE public.roles;
       public         heap r       postgres    false            �            1259    24947    roles_id_seq    SEQUENCE     �   CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.roles_id_seq;
       public               postgres    false    219            s           0    0    roles_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;
          public               postgres    false    218            �            1259    41376    verification_codes    TABLE     %  CREATE TABLE public.verification_codes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    code character varying(6) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
 &   DROP TABLE public.verification_codes;
       public         heap r       postgres    false            �            1259    41375    verification_codes_id_seq    SEQUENCE     �   CREATE SEQUENCE public.verification_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 0   DROP SEQUENCE public.verification_codes_id_seq;
       public               postgres    false    223            t           0    0    verification_codes_id_seq    SEQUENCE OWNED BY     W   ALTER SEQUENCE public.verification_codes_id_seq OWNED BY public.verification_codes.id;
          public               postgres    false    222            �           2604    41393    logs id    DEFAULT     b   ALTER TABLE ONLY public.logs ALTER COLUMN id SET DEFAULT nextval('public.logs_id_seq'::regclass);
 6   ALTER TABLE public.logs ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    224    225    225            �           2604    24951    roles id    DEFAULT     d   ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);
 7   ALTER TABLE public.roles ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    219    218    219            �           2604    24958    users id    DEFAULT     e   ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);
 7   ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    220    221    221            �           2604    41379    verification_codes id    DEFAULT     ~   ALTER TABLE ONLY public.verification_codes ALTER COLUMN id SET DEFAULT nextval('public.verification_codes_id_seq'::regclass);
 D   ALTER TABLE public.verification_codes ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    222    223    223            i          0    41390    logs 
   TABLE DATA           U   COPY public.logs (id, user_id, endpoint, ip_address, status, created_at) FROM stdin;
    public               postgres    false    225   h>       c          0    24948    roles 
   TABLE DATA           0   COPY public.roles (id, description) FROM stdin;
    public               postgres    false    219   �D       e          0    24955    users 
   TABLE DATA           �   COPY public.users (id, name, email, password, salt, role_id, status, created_by, server_name_1, key_reference_1, server_name_2, key_reference_2) FROM stdin;
    public               postgres    false    221   �D       g          0    41376    verification_codes 
   TABLE DATA           ]   COPY public.verification_codes (id, user_id, code, expires_at, used, created_at) FROM stdin;
    public               postgres    false    223   �E       u           0    0    User_id_seq    SEQUENCE SET     <   SELECT pg_catalog.setval('public."User_id_seq"', 23, true);
          public               postgres    false    220            v           0    0    logs_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public.logs_id_seq', 117, true);
          public               postgres    false    224            w           0    0    roles_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public.roles_id_seq', 1, false);
          public               postgres    false    218            x           0    0    verification_codes_id_seq    SEQUENCE SET     H   SELECT pg_catalog.setval('public.verification_codes_id_seq', 12, true);
          public               postgres    false    222            �           2606    24962    users User_pkey 
   CONSTRAINT     O   ALTER TABLE ONLY public.users
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);
 ;   ALTER TABLE ONLY public.users DROP CONSTRAINT "User_pkey";
       public                 postgres    false    221            �           2606    41398    logs logs_pkey 
   CONSTRAINT     L   ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);
 8   ALTER TABLE ONLY public.logs DROP CONSTRAINT logs_pkey;
       public                 postgres    false    225            �           2606    24953    roles roles_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_pkey;
       public                 postgres    false    219            �           2606    41383 *   verification_codes verification_codes_pkey 
   CONSTRAINT     h   ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);
 T   ALTER TABLE ONLY public.verification_codes DROP CONSTRAINT verification_codes_pkey;
       public                 postgres    false    223            �           2606    24965    users User_role_id_fkey    FK CONSTRAINT     x   ALTER TABLE ONLY public.users
    ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id);
 C   ALTER TABLE ONLY public.users DROP CONSTRAINT "User_role_id_fkey";
       public               postgres    false    219    221    4806            �           2606    41399    logs logs_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
 @   ALTER TABLE ONLY public.logs DROP CONSTRAINT logs_user_id_fkey;
       public               postgres    false    4808    225    221            �           2606    41404    users users_created_by_fkey    FK CONSTRAINT     }   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
 E   ALTER TABLE ONLY public.users DROP CONSTRAINT users_created_by_fkey;
       public               postgres    false    4808    221    221            �           2606    41384 2   verification_codes verification_codes_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 \   ALTER TABLE ONLY public.verification_codes DROP CONSTRAINT verification_codes_user_id_fkey;
       public               postgres    false    223    4808    221            i   W  x��YMo7=ۿ��²�)jnul��h���&5�:���ȿ/E�gfvv��9�I==>*z�ׯ'���ǟg�_����������0�	��Qγ�����5Ua��S��rϡ�����x���}ڝy�=�`����E�}�z��x�=��}|���û�K�7|}(�Pal@uU�ϐ��,{!-������*�n��<��r�l��%�ӶD�e�[�u��ȼ�%�i]0��<��"�U"������Z�dK0�)��[b�5YL{�ʖ�ښ�Z@ۆ`�S�\4O�n&��~	�ڂ1�#g��f��!l�d{nWC(W��ǥ[V�\�\ѡl���r���[Hǥ=���`,�Rx!^J�n@��������ro�.5#�U��2�d.�$�P{=��o\��a�#��z�75���ԥz\@����PR�jf��!��gCR���- `)���|5˖��l��;k	�d3S��t:z@゠�]"��Ax:��	��B�UCk�ig ��%U���t���I�AmQ�N��,�)N�G��ħ�P?d[�g�M��X���N���:�ɿl~]j(gh��������������KSb��D<l�xmܖ"٢l�����?��p`H J%�Z���1�C)D^ĮaQ�0�b"Q�\��}�&I�����=�O`H\��7p������ٰ_KJ%�Z�NIݜ� M����l4���Tu(.�|*���V�Mg�b��]pp��fxI����q��6p���Ӓy1^��N�ͤ{�(�e+ 7m�"�Of�1 ���Þ�D܎ Hn�3�&�< -�쳦����>�S�/����ׄ�� ����2u���=���.�pײ�~�iȒ 2u��L��
��9�U;�2�� ~���d�R��\� ��
���Fe��d�%�B�t�ĺ�����͵ ��Jl@���5�.��[M�́l0���YȂ��T�m����xX���
>��ė�1�7�?LV�j��L��CJ�9��S�٤o������3wJ]����ʴ�������-�d!N�ɂ�~� �1�6��3�~�e+@<���m�J4�俻���_��o��������ξ��zBF�8!��!,���Mb���$"�<p��8�7������W�hsC,����x�L���y>�ҟ�lL���T�-�Zh녴�̶U[�A��m� ����f���W��=��}����p\�ݺ�����Ƀ���t{Vǔ=�q=��*u���:����o�����F7|D[�N}%W��R�$�UT��q��&�g�^�����z�_4\p-ky���'��3zc;��gP�8�;��0 �X��*�����p�f�������>|��t��m�s������7;�#sAU����"~���B^m�͠Ĭ1����K_�xk������13��^����n^��Z�/�y��/��o�9@�2��_�P��z�/�K���z�{�4 ��>z�a̿��a��	��z�0Vͥ�#����j����v��w.T�+���`̻ŝ�#�*E���0�TRwm���&���i I[);��{�Ҁ r3@����1&�z ����K�_�������v      c      x�3�,-N-�2�LL�������� :�      e   �   x�u�Kj1Dך�Ȩ[�Qk����O�!��3�"���0d((
����~��Q�%����5~�>6�~��%�M�v-��jH6�MJ��4�*>:I�A�3�@�L�Ď�w����,X_R��60���za7BFi�Vƚ	AȣC��r=�bբ��e�tٷ�B3 깗陨i�#F$o���'�)t�L�Lh����H�,��Z9t^ΧeY~��]/      g      x������ � �     